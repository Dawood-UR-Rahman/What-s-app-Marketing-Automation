import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  proto,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
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
  phase?: "generating_qr" | "waiting_scan" | "pairing" | "syncing" | "ready";
}

export class WhatsAppService {
  private connections: Map<string, WhatsAppConnection> = new Map();
  private sessionsPath: string;
  private io: Server | null = null;
  private webhookCallbacks: Map<string, (data: any) => Promise<void>> = new Map();
  private connectionPromises: Map<string, Promise<WhatsAppConnection>> = new Map();

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
    // Guard against concurrent createConnection calls - return existing promise
    const existingPromise = this.connectionPromises.get(connectionId);
    if (existingPromise) {
      return existingPromise;
    }

    // If connection already exists and is active, return it
    const existingConnection = this.connections.get(connectionId);
    if (existingConnection) {
      return existingConnection;
    }

    const connectionPromise = this._createConnectionInternal(connectionId);
    this.connectionPromises.set(connectionId, connectionPromise);

    try {
      const result = await connectionPromise;
      return result;
    } finally {
      // Only delete if this promise is still the current one
      if (this.connectionPromises.get(connectionId) === connectionPromise) {
        this.connectionPromises.delete(connectionId);
      }
    }
  }

  private async _createConnectionInternal(connectionId: string): Promise<WhatsAppConnection> {
    const sessionPath = path.join(this.sessionsPath, connectionId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Rehydrate auth state to get latest credentials
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const { version } = await fetchLatestBaileysVersion();
    console.log(`Creating connection ${connectionId} with WA version ${version.join('.')}`);

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: false,
    });

    const connection: WhatsAppConnection = {
      socket,
      connectionId,
      qrCode: null,
      status: "connecting",
      phase: "generating_qr",
    };

    this.connections.set(connectionId, connection);

    this.setupEventHandlers(socket, connectionId, saveCreds);

    await storage.updateConnection(connectionId, { status: "connecting" });

    if (this.io) {
      this.io.emit("connection-phase", { connectionId, phase: "generating_qr" });
    }

    return connection;
  }

  private async restartConnection(connectionId: string): Promise<void> {
    console.log(`Restarting connection ${connectionId} after pairing...`);
    
    const oldConnection = this.connections.get(connectionId);
    if (!oldConnection) return;

    try {
      // Clean up old socket
      oldConnection.socket.ev.removeAllListeners("connection.update");
      oldConnection.socket.ev.removeAllListeners("creds.update");
      oldConnection.socket.ev.removeAllListeners("messages.upsert");
      await oldConnection.socket.end(undefined);
    } catch (error) {
      console.log(`Error closing old socket: ${error}`);
    }

    this.connections.delete(connectionId);

    // Wait a moment for credentials to be fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create new connection with fresh auth state
    await this.createConnection(connectionId);
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
      connection.phase = "waiting_scan";
      await storage.updateConnection(connectionId, { qrCode: qr, status: "connecting" });
      
      if (this.io) {
        this.io.emit("qr-update", { connectionId, qr });
        this.io.emit("connection-phase", { connectionId, phase: "waiting_scan" });
      }
    }

    if (connectionState === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      
      // Check if this is a restart required situation (code 515 after QR pairing)
      if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
        connection.phase = "pairing";
        
        if (this.io) {
          this.io.emit("connection-phase", { connectionId, phase: "pairing" });
        }
        
        // Restart the connection with fresh auth state
        await this.restartConnection(connectionId);
        return;
      }
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(`Connection ${connectionId} closed unexpectedly (code: ${statusCode}), reconnecting...`);
        
        // Wait before reconnecting to avoid rapid reconnection loops
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.restartConnection(connectionId);
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
      connection.phase = "syncing";
      
      const phoneNumber = connection.socket.user?.id.split(":")[0] || null;
      
      if (this.io) {
        this.io.emit("connection-phase", { connectionId, phase: "syncing" });
      }
      
      await storage.updateConnection(connectionId, {
        status: "connected",
        phoneNumber: phoneNumber ? `+${phoneNumber}` : null,
        qrCode: null,
        lastActive: new Date(),
      });

      await this.syncMessages(connectionId);
      
      connection.phase = "ready";
      
      if (this.io) {
        this.io.emit("connection-status", { connectionId, status: "connected", phoneNumber });
        this.io.emit("connection-phase", { connectionId, phase: "ready" });
      }
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

      const connection = this.connections.get(connectionId);
      if (!connection) continue;

      const from = msg.key.remoteJid || "";
      let messageBody = "";
      let mediaType: string | null = null;
      let mediaUrl: string | null = null;
      let mediaMetadata: any = null;

      // Check for button response first
      let buttonResponseId: string | null = null;
      let buttonPayload: string | null = null;
      let quotedMessageId: string | null = null;

      if (msg.message.buttonsResponseMessage) {
        buttonResponseId = msg.message.buttonsResponseMessage.selectedButtonId || null;
        buttonPayload = msg.message.buttonsResponseMessage.selectedDisplayText || null;
        messageBody = `[Button Response: ${buttonPayload || buttonResponseId}]`;
        
        const quotedStanzaId = msg.message.buttonsResponseMessage.contextInfo?.stanzaId;
        if (quotedStanzaId) {
          const quotedMessage = await storage.getMessageByProviderId(quotedStanzaId);
          if (quotedMessage) {
            quotedMessageId = quotedMessage.id;
          }
        }
      } else if (msg.message.templateButtonReplyMessage) {
        buttonResponseId = msg.message.templateButtonReplyMessage.selectedId || null;
        buttonPayload = msg.message.templateButtonReplyMessage.selectedDisplayText || null;
        messageBody = `[Button Response: ${buttonPayload || buttonResponseId}]`;
        
        const quotedStanzaId = msg.message.templateButtonReplyMessage.contextInfo?.stanzaId;
        if (quotedStanzaId) {
          const quotedMessage = await storage.getMessageByProviderId(quotedStanzaId);
          if (quotedMessage) {
            quotedMessageId = quotedMessage.id;
          }
        }
      } else if (msg.message.conversation) {
        messageBody = msg.message.conversation;
      } else if (msg.message.extendedTextMessage?.text) {
        messageBody = msg.message.extendedTextMessage.text;
      } else if (msg.message.imageMessage) {
        const caption = msg.message.imageMessage.caption || "";
        messageBody = caption || "[IMAGE]";
        mediaType = "image";
        mediaMetadata = {
          mimetype: msg.message.imageMessage.mimetype,
          fileLength: msg.message.imageMessage.fileLength,
          caption,
        };
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaUrl = `data:${msg.message.imageMessage.mimetype};base64,${buffer.toString('base64')}`;
        } catch (err) {
          console.error("Failed to download image:", err);
        }
      } else if (msg.message.videoMessage) {
        const caption = msg.message.videoMessage.caption || "";
        messageBody = caption || "[VIDEO]";
        mediaType = "video";
        mediaMetadata = {
          mimetype: msg.message.videoMessage.mimetype,
          fileLength: msg.message.videoMessage.fileLength,
          caption,
        };
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaUrl = `data:${msg.message.videoMessage.mimetype};base64,${buffer.toString('base64')}`;
        } catch (err) {
          console.error("Failed to download video:", err);
        }
      } else if (msg.message.audioMessage) {
        messageBody = "[AUDIO]";
        mediaType = "audio";
        mediaMetadata = {
          mimetype: msg.message.audioMessage.mimetype,
          fileLength: msg.message.audioMessage.fileLength,
          ptt: msg.message.audioMessage.ptt,
        };
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaUrl = `data:${msg.message.audioMessage.mimetype};base64,${buffer.toString('base64')}`;
        } catch (err) {
          console.error("Failed to download audio:", err);
        }
      } else if (msg.message.documentMessage) {
        const fileName = msg.message.documentMessage.fileName || "file";
        messageBody = `[DOCUMENT: ${fileName}]`;
        mediaType = "document";
        mediaMetadata = {
          mimetype: msg.message.documentMessage.mimetype,
          fileLength: msg.message.documentMessage.fileLength,
          fileName,
        };
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaUrl = `data:${msg.message.documentMessage.mimetype};base64,${buffer.toString('base64')}`;
        } catch (err) {
          console.error("Failed to download document:", err);
        }
      } else if (msg.message.stickerMessage) {
        messageBody = "[STICKER]";
        mediaType = "sticker";
      } else {
        messageBody = "[Media or unsupported message type]";
      }

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
        isRead: false,
        clientMessageId: null,
        mediaType,
        mediaUrl,
        mediaMetadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null,
        buttonResponseId,
        buttonPayload,
        quotedMessageId,
      });

      // Emit real-time message with media to connected clients
      if (this.io) {
        this.io.emit("new-message", {
          connectionId,
          chatId,
          message: savedMessage,
          mediaType,
          mediaUrl,
          mediaMetadata,
        });
      }

      // Call webhook asynchronously (non-blocking)
      const webhookCallback = this.webhookCallbacks.get(connectionId);
      if (webhookCallback) {
        const clientNumber = from.replace("@s.whatsapp.net", "").replace("@g.us", "");
        
        const webhookPayload: any = {
          message_id: savedMessage.id,
          from: clientNumber,
          message: messageBody,
          client_message_id: savedMessage.clientMessageId,
          client_number: clientNumber,
          media_type: mediaType,
          media_url: mediaUrl,
          media_metadata: mediaMetadata,
          provider_message_id: providerMessageId,
          connection_id: connectionId,
          timestamp: savedMessage.timestamp.toISOString(),
        };

        if (buttonResponseId) {
          webhookPayload.button_response = {
            button_id: buttonResponseId,
            button_text: buttonPayload,
          };
          
          if (quotedMessageId) {
            webhookPayload.quoted_message_id = quotedMessageId;
          }
        }
        
        this.deliverWebhook(webhookCallback, webhookPayload).catch(err => {
          console.error("Background webhook delivery failed:", err);
        });
      }
    }
  }

  private async deliverWebhook(callback: (data: any) => Promise<void>, data: any) {
    // Non-blocking webhook delivery - runs in background
    await callback(data);
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
    clientMessageId?: string,
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "document",
    fileName?: string,
    mimetype?: string
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status !== "connected") {
      return { success: false, error: "Connection not active" };
    }

    try {
      const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
      
      let messageContent: any;
      let messageBodyForStorage = message;

      if (mediaUrl && mediaType) {
        // Download or decode media
        const mediaBuffer = mediaUrl.startsWith("http") 
          ? await this.downloadMedia(mediaUrl) 
          : mediaUrl.startsWith("data:") 
            ? this.decodeDataUrl(mediaUrl)
            : Buffer.from(mediaUrl, 'base64');

        // Detect mimetype from data URL if not provided
        const detectedMimetype = mimetype || (mediaUrl.startsWith("data:") 
          ? mediaUrl.split(';')[0].split(':')[1] 
          : this.guessMimetype(mediaType));

        // Build Baileys-compliant message content
        if (mediaType === "image") {
          messageContent = {
            image: mediaBuffer,
            caption: message || undefined,
          };
        } else if (mediaType === "video") {
          messageContent = {
            video: mediaBuffer,
            caption: message || undefined,
            mimetype: detectedMimetype,
          };
        } else if (mediaType === "audio") {
          messageContent = {
            audio: mediaBuffer,
            mimetype: detectedMimetype || "audio/ogg; codecs=opus",
            ptt: false, // Set to true for voice messages
          };
        } else if (mediaType === "document") {
          if (!fileName) {
            return { success: false, error: "fileName is required for document messages" };
          }
          messageContent = {
            document: mediaBuffer,
            mimetype: detectedMimetype || "application/octet-stream",
            fileName: fileName,
            caption: message || undefined,
          };
        }
        
        messageBodyForStorage = `[${mediaType.toUpperCase()}]${message ? `: ${message}` : ""}`;
      } else {
        // Send text message
        messageContent = { text: message };
      }
      
      const sentMsg = await connection.socket.sendMessage(jid, messageContent);
      const providerMessageId = sentMsg?.key.id || "";

      const savedMessage = await storage.createMessage({
        connectionId,
        chatId: jid,
        from: connectionId,
        to: jid,
        messageBody: messageBodyForStorage,
        clientMessageId: clientMessageId || null,
        providerMessageId,
        status: "sent",
        isSent: true,
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        mediaMetadata: mediaType && (fileName || mimetype) ? JSON.stringify({ fileName, mimetype }) : null,
      });

      if (this.io) {
        this.io.emit("message-sent", {
          connectionId,
          chatId: jid,
          message: savedMessage,
        });
        
        // Also emit the full message for real-time updates
        this.io.emit("new-message", {
          connectionId,
          chatId: jid,
          message: savedMessage,
        });
      }

      return { success: true, providerMessageId };
    } catch (error) {
      console.error(`Error sending message for ${connectionId}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async downloadMedia(url: string): Promise<Buffer> {
    const axios = (await import('axios')).default;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  private decodeDataUrl(dataUrl: string): Buffer {
    const base64Data = dataUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  private guessMimetype(mediaType: string): string {
    const mimetypes: Record<string, string> = {
      image: "image/jpeg",
      video: "video/mp4",
      audio: "audio/ogg; codecs=opus",
      document: "application/pdf",
    };
    return mimetypes[mediaType] || "application/octet-stream";
  }

  async sendButtons(
    connectionId: string,
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>,
    footer?: string,
    clientMessageId?: string
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status !== "connected") {
      return { success: false, error: "Connection not active" };
    }

    try {
      const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;

      const buttonMessage = {
        text: text,
        footer: footer || "",
        buttons: buttons.map((btn, index) => ({
          buttonId: btn.id,
          buttonText: { displayText: btn.title },
          type: 1,
        })),
        headerType: 1,
      };

      const sentMsg = await connection.socket.sendMessage(jid, buttonMessage);
      const providerMessageId = sentMsg?.key.id || "";

      const buttonsData = {
        text,
        footer: footer || undefined,
        buttons,
      };

      const savedMessage = await storage.createMessage({
        connectionId,
        chatId: jid,
        from: connectionId,
        to: jid,
        messageBody: text,
        clientMessageId: clientMessageId || null,
        providerMessageId,
        status: "sent",
        isSent: true,
        buttonType: "reply_buttons",
        buttonsData: buttonsData as any,
        mediaType: null,
        mediaUrl: null,
        mediaMetadata: null,
      });

      if (this.io) {
        this.io.emit("message-sent", {
          connectionId,
          chatId: jid,
          message: savedMessage,
        });

        this.io.emit("new-message", {
          connectionId,
          chatId: jid,
          message: savedMessage,
        });
      }

      return { success: true, providerMessageId };
    } catch (error) {
      console.error(`Error sending buttons for ${connectionId}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  async sendPoll(
    connectionId: string,
    to: string,
    question: string,
    options: string[],
    clientMessageId?: string
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status !== "connected") {
      return { success: false, error: "Connection not active" };
    }

    try {
      const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;

      const pollMessage = {
        poll: {
          name: question,
          values: options,
          selectableCount: 1,
        },
      };

      const sentMsg = await connection.socket.sendMessage(jid, pollMessage);
      const providerMessageId = sentMsg?.key.id || "";

      const savedMessage = await storage.createMessage({
        connectionId,
        chatId: jid,
        from: connectionId,
        to: jid,
        messageBody: `[POLL] ${question}`,
        clientMessageId: clientMessageId || null,
        providerMessageId,
        status: "sent",
        isSent: true,
        pollQuestion: question,
        pollOptions: options as any,
        mediaType: null,
        mediaUrl: null,
        mediaMetadata: null,
      });

      if (this.io) {
        this.io.emit("message-sent", {
          connectionId,
          chatId: jid,
          message: savedMessage,
        });

        this.io.emit("new-message", {
          connectionId,
          chatId: jid,
          message: savedMessage,
        });
      }

      return { success: true, providerMessageId };
    } catch (error) {
      console.error(`Error sending poll for ${connectionId}:`, error);
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
      if (conn.status === "connected") {
        const sessionPath = path.join(this.sessionsPath, conn.connectionId);
        if (fs.existsSync(sessionPath)) {
          try {
            await this.createConnection(conn.connectionId);
            console.log(`Restored connection: ${conn.connectionId}`);
          } catch (error) {
            console.error(`Failed to restore connection ${conn.connectionId}:`, error);
            await storage.updateConnection(conn.connectionId, { status: "disconnected" });
          }
        } else {
          console.log(`Session files not found for ${conn.connectionId}, marking as disconnected`);
          await storage.updateConnection(conn.connectionId, { status: "disconnected" });
        }
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
