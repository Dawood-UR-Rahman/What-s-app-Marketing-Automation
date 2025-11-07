import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as fs from "fs";
import * as path from "path";
import { storage } from "../storage";
import type { Server } from "socket.io";

export interface WhatsAppConnection {
  socket: WASocket;
  connectionId: string;
  qrCode: string | null;
  status: "connecting" | "connected" | "disconnected";
}

export class WhatsAppService {
  private connections: Map<string, WhatsAppConnection> = new Map();
  private sessionsPath: string;
  private io: Server | null = null;
  private webhookCallbacks: Map<string, (data: any) => Promise<void>> = new Map();

  constructor(sessionsPath: string = "./whatsapp-sessions") {
    this.sessionsPath = sessionsPath;
    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true });
    }
  }

  setSocketIO(io: Server) {
    this.io = io;
  }

  registerWebhookCallback(connectionId: string, callback: (data: any) => Promise<void>) {
    this.webhookCallbacks.set(connectionId, callback);
  }

  async createConnection(connectionId: string): Promise<WhatsAppConnection> {
    if (this.connections.has(connectionId)) {
      return this.connections.get(connectionId)!;
    }

    const sessionPath = path.join(this.sessionsPath, connectionId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    const connection: WhatsAppConnection = {
      socket,
      connectionId,
      qrCode: null,
      status: "connecting",
    };

    this.connections.set(connectionId, connection);

    this.setupEventHandlers(socket, connectionId, saveCreds);

    await storage.updateConnection(connectionId, { status: "connecting" });

    return connection;
  }

  private setupEventHandlers(
    socket: WASocket,
    connectionId: string,
    saveCreds: () => Promise<void>
  ) {
    socket.ev.on("connection.update", async (update) => {
      await this.handleConnectionUpdate(connectionId, update);
    });

    socket.ev.on("creds.update", async () => {
      await saveCreds();
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      await this.handleMessagesUpsert(connectionId, messages, type);
    });
  }

  private async handleConnectionUpdate(
    connectionId: string,
    update: Partial<BaileysEventMap["connection.update"]>
  ) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { connection: connectionState, lastDisconnect, qr } = update;

    if (qr) {
      connection.qrCode = qr;
      await storage.updateConnection(connectionId, { qrCode: qr, status: "connecting" });
      
      if (this.io) {
        this.io.emit("qr-update", { connectionId, qr });
      }
    }

    if (connectionState === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(`Connection ${connectionId} closed, reconnecting...`);
        await this.createConnection(connectionId);
      } else {
        console.log(`Connection ${connectionId} logged out`);
        this.connections.delete(connectionId);
        await storage.updateConnection(connectionId, { 
          status: "disconnected",
          lastActive: new Date()
        });
        
        if (this.io) {
          this.io.emit("connection-status", { connectionId, status: "disconnected" });
        }
      }
    } else if (connectionState === "open") {
      connection.status = "connected";
      connection.qrCode = null;
      
      const phoneNumber = connection.socket.user?.id.split(":")[0] || null;
      
      await storage.updateConnection(connectionId, {
        status: "connected",
        phoneNumber: phoneNumber ? `+${phoneNumber}` : null,
        qrCode: null,
        lastActive: new Date(),
      });

      if (this.io) {
        this.io.emit("connection-status", { connectionId, status: "connected", phoneNumber });
      }

      await this.syncMessages(connectionId);
    }
  }

  private async handleMessagesUpsert(
    connectionId: string,
    messages: proto.IWebMessageInfo[],
    type: "notify" | "append"
  ) {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid || "";
      const messageBody = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         "[Media]";
      const providerMessageId = msg.key.id || "";
      const chatId = from;

      const savedMessage = await storage.createMessage({
        connectionId,
        chatId,
        from,
        to: connectionId,
        messageBody,
        providerMessageId,
        status: "received",
        isSent: false,
        clientMessageId: null,
      });

      if (this.io) {
        this.io.emit("new-message", {
          connectionId,
          chatId,
          message: savedMessage,
        });
      }

      const webhookCallback = this.webhookCallbacks.get(connectionId);
      if (webhookCallback) {
        await webhookCallback({
          from,
          message: messageBody,
          provider_message_id: providerMessageId,
          connection_id: connectionId,
        });
      }
    }
  }

  private async syncMessages(connectionId: string) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      console.log(`Syncing messages for ${connectionId}...`);
      
    } catch (error) {
      console.error(`Error syncing messages for ${connectionId}:`, error);
    }
  }

  async sendMessage(
    connectionId: string,
    to: string,
    message: string,
    clientMessageId?: string
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status !== "connected") {
      return { success: false, error: "Connection not active" };
    }

    try {
      const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
      
      const sentMsg = await connection.socket.sendMessage(jid, {
        text: message,
      });

      const providerMessageId = sentMsg?.key.id || "";

      await storage.createMessage({
        connectionId,
        chatId: jid,
        from: connectionId,
        to: jid,
        messageBody: message,
        clientMessageId: clientMessageId || null,
        providerMessageId,
        status: "sent",
        isSent: true,
      });

      if (this.io) {
        this.io.emit("message-sent", {
          connectionId,
          chatId: jid,
          clientMessageId,
          providerMessageId,
        });
      }

      return { success: true, providerMessageId };
    } catch (error) {
      console.error(`Error sending message for ${connectionId}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  getConnection(connectionId: string): WhatsAppConnection | undefined {
    return this.connections.get(connectionId);
  }

  async disconnectConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      await connection.socket.logout();
      this.connections.delete(connectionId);
      
      const sessionPath = path.join(this.sessionsPath, connectionId);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }

      await storage.updateConnection(connectionId, { 
        status: "disconnected",
        lastActive: new Date()
      });
    }
  }

  async restoreAllConnections() {
    console.log("Restoring all WhatsApp connections...");
    const allConnections = await storage.getAllConnections();

    for (const conn of allConnections) {
      if (conn.status === "connected" || conn.status === "connecting") {
        try {
          await this.createConnection(conn.connectionId);
          console.log(`Restored connection: ${conn.connectionId}`);
        } catch (error) {
          console.error(`Failed to restore connection ${conn.connectionId}:`, error);
        }
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
