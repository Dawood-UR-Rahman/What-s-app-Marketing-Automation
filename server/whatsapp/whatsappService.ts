import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  proto,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  getAggregateVotesInPollMessage,
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
      getMessage: async (key) => {
        if (key.id) {
          const msg = await storage.getMessageByProviderId(key.id);
          if (msg && msg.pollQuestion && msg.pollOptions) {
            // Return poll creation message for vote aggregation - must match Baileys schema
            // Use stored selectableCount or default to 1 for backward compatibility
            return {
              message: {
                pollCreationMessage: {
                  name: msg.pollQuestion,
                  options: (msg.pollOptions as string[]).map((opt: string) => ({ optionName: opt })),
                  selectableOptionsCount: msg.pollSelectableCount || 1,
                },
              },
            } as any;
          } else if (msg) {
            // Return empty message for other message types
            return { message: {} } as any;
          }
        }
        return undefined;
      },
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
      oldConnection.socket.ev.removeAllListeners("messages.update");
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

    socket.ev.on("messages.update", async (updates) => {
      console.log(`[${connectionId}] messages.update event received:`, JSON.stringify(updates, null, 2));
      await this.handleMessagesUpdate(connectionId, updates);
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
      if (!msg.message) continue;

      const connection = this.connections.get(connectionId);
      if (!connection) continue;

      // Determine if this is an outgoing message
      const isOutgoing = msg.key.fromMe || false;
      const from = isOutgoing ? connectionId : (msg.key.remoteJid || "");
      const chatId = msg.key.remoteJid || "";
      
      let messageBody = "";
      let mediaType: string | null = null;
      let mediaUrl: string | null = null;
      let mediaMetadata: any = null;

      // Check for button response first
      let buttonResponseId: string | null = null;
      let buttonPayload: string | null = null;
      let quotedMessageId: string | null = null;
      let pollResponse: { selectedOption: string; pollMessageId?: string } | null = null;
      let pollQuestion: string | null = null;
      let pollOptions: string[] | null = null;
      let pollSelectableCount: number | null = null;

      if (msg.message.pollUpdateMessage) {
        // Poll responses are handled in messages.update event, not here
        // Skip processing in messages.upsert to avoid duplication
        continue;
      } else if (msg.message.buttonsResponseMessage) {
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
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          mediaUrl = `data:${msg.message.stickerMessage.mimetype};base64,${buffer.toString('base64')}`;
        } catch (err) {
          console.error("Failed to download sticker:", err);
        }
      } else if (msg.message.pollCreationMessage) {
        // Handle incoming poll messages
        const pollCreation = msg.message.pollCreationMessage;
        pollQuestion = pollCreation.name || "";
        pollOptions = pollCreation.options?.map((opt: any) => opt.optionName) || [];
        pollSelectableCount = pollCreation.selectableOptionsCount || 1;
        messageBody = pollQuestion ? `[POLL] ${pollQuestion}` : "[POLL]";
      } else if (msg.message.locationMessage) {
        messageBody = "[LOCATION]";
        mediaType = "location";
      } else if (msg.message.contactMessage) {
        messageBody = "[CONTACT]";
        mediaType = "contact";
      } else if (msg.message.liveLocationMessage) {
        messageBody = "[LIVE LOCATION]";
        mediaType = "location";
      } else if (msg.message.groupInviteMessage) {
        messageBody = "[GROUP INVITE]";
        mediaType = "group_invite";
      } else if (msg.message.listMessage) {
        messageBody = "[LIST MESSAGE]";
        mediaType = "list";
      } else if (msg.message.listResponseMessage) {
        messageBody = "[LIST RESPONSE]";
        mediaType = "list_response";
      } else {
        // Log unhandled message types for debugging
        const messageKeys = Object.keys(msg.message || {});
        console.log("Unhandled message type:", messageKeys);
        messageBody = messageKeys.length > 0 ? `[${messageKeys[0].toUpperCase()}]` : "[UNKNOWN MESSAGE TYPE]";
      }

      const providerMessageId = msg.key.id || "";

      // Skip if this message already exists (sent via sendPoll or sendMessage)
      if (providerMessageId && isOutgoing) {
        const existingMsg = await storage.getMessageByProviderId(providerMessageId);
        if (existingMsg) {
          console.log(`[${connectionId}] Outgoing message ${providerMessageId} already saved, skipping`);
          continue;
        }
      }

      // Ensure we have a message body - if poll, use poll question; if poll response, use the response message
      const finalMessageBody = messageBody || (pollQuestion ? `[POLL] ${pollQuestion}` : (pollResponse ? `[Poll Vote: ${pollResponse.selectedOption}]` : "[MESSAGE]"));

      const savedMessage = await storage.createMessage({
        connectionId,
        chatId,
        from,
        to: isOutgoing ? chatId : connectionId,
        messageBody: finalMessageBody,
        providerMessageId,
        status: isOutgoing ? "sent" : "received",
        isSent: isOutgoing,
        isRead: false,
        clientMessageId: null,
        mediaType,
        mediaUrl,
        mediaMetadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null,
        buttonResponseId,
        buttonPayload,
        quotedMessageId,
        pollQuestion: pollQuestion || null,
        pollOptions: pollOptions && pollOptions.length > 0 ? (pollOptions as any) : null,
        pollSelectableCount: pollSelectableCount || null,
        pollResponseOption: pollResponse?.selectedOption || null,
        pollResponseMessageId: pollResponse ? quotedMessageId : null, // Reference to the original poll message
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

      // Call webhook asynchronously (non-blocking) - only for incoming messages
      if (!isOutgoing) {
        const webhookCallback = this.webhookCallbacks.get(connectionId);
        if (webhookCallback) {
          const clientNumber = from.replace("@s.whatsapp.net", "").replace("@g.us", "");
          
          // Determine event type
          let eventType = "message.received";
          if (buttonResponseId) {
            eventType = "button.clicked";
          }
          
          const webhookPayload: any = {
            event: eventType,
            connection_id: connectionId,
            timestamp: savedMessage.timestamp.toISOString(),
            data: {
              message_id: savedMessage.id,
              from: from,
              to: connectionId,
              chat_id: chatId,
              message_body: finalMessageBody,
              message_type: mediaType || "text",
              provider_message_id: providerMessageId,
            }
          };

          // Add poll data if this is a poll message
          if (pollQuestion && pollOptions && pollOptions.length > 0) {
            webhookPayload.data.poll_question = pollQuestion;
            webhookPayload.data.poll_options = pollOptions;
          }

          // Add poll response if this is a poll reply
          if (pollResponse) {
            webhookPayload.data.poll_response = {
              selected_option: pollResponse.selectedOption,
              poll_message_id: pollResponse.pollMessageId,
            };
            
            if (quotedMessageId) {
              webhookPayload.data.quoted_message_id = quotedMessageId;
            }
          } else if (buttonResponseId) {
            webhookPayload.data.button_response = {
              button_id: buttonResponseId,
              button_text: buttonPayload,
            };
            
            if (quotedMessageId) {
              webhookPayload.data.quoted_message_id = quotedMessageId;
            }
          }

          // Add media information if present
          if (mediaType) {
            webhookPayload.data.media_type = mediaType;
            webhookPayload.data.media_url = mediaUrl;
            if (mediaMetadata) {
              webhookPayload.data.media_metadata = mediaMetadata;
            }
          }
          
          // Deliver webhook asynchronously
          this.deliverWebhook(webhookCallback, webhookPayload).catch(err => {
            console.error("Background webhook delivery failed:", err);
          });
        }
      }
    }
  }

  private async handleMessagesUpdate(
    connectionId: string,
    updates: Partial<BaileysEventMap["messages.update"]>
  ) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.log(`[${connectionId}] Connection not found for messages.update`);
      return;
    }

    console.log(`[${connectionId}] Processing ${updates.length} message updates`);
    
    for (const update of updates) {
      const { key, update: msgUpdate } = update;
      
      console.log(`[${connectionId}] Update for message ${key.id}:`, { 
        hasPollUpdates: !!msgUpdate.pollUpdates,
        pollUpdatesCount: msgUpdate.pollUpdates?.length || 0 
      });
      
      if (msgUpdate.pollUpdates) {
        console.log(`[${connectionId}] Processing poll updates for message ${key.id}`);
        try {
          const pollMessage = await storage.getMessageByProviderId(key.id || "");
          if (!pollMessage) {
            console.log(`[${connectionId}] Poll message not found for update:`, key.id);
            continue;
          }
          console.log(`[${connectionId}] Found poll message:`, pollMessage.id, pollMessage.pollQuestion);

          const pollCreationMessage = {
            message: {
              pollCreationMessage: {
                name: pollMessage.pollQuestion || "",
                options: (pollMessage.pollOptions as string[] || []).map((opt: string) => ({ optionName: opt })),
                selectableOptionsCount: 1,
              },
            },
          };

          const votes = getAggregateVotesInPollMessage({
            message: pollCreationMessage as any,
            pollUpdates: msgUpdate.pollUpdates,
          });

          for (const option of votes) {
            for (const voter of option.voters) {
              const from = voter;
              const selectedOption = option.name;
              
              const savedMessage = await storage.createMessage({
                connectionId,
                chatId: pollMessage.chatId,
                from,
                to: connectionId,
                messageBody: `[Poll Response: ${selectedOption}]`,
                providerMessageId: `poll_vote_${Date.now()}`,
                status: "received",
                isSent: false,
                isRead: false,
                clientMessageId: null,
                mediaType: null,
                mediaUrl: null,
                mediaMetadata: null,
                buttonResponseId: null,
                buttonPayload: null,
                quotedMessageId: pollMessage.id,
                pollQuestion: pollMessage.pollQuestion,
                pollOptions: pollMessage.pollOptions as any,
                pollResponseOption: selectedOption,
                pollResponseMessageId: pollMessage.clientMessageId,
              });

              if (this.io) {
                this.io.emit("new-message", {
                  connectionId,
                  chatId: pollMessage.chatId,
                  message: savedMessage,
                });
              }

              const webhookCallback = this.webhookCallbacks.get(connectionId);
              if (webhookCallback) {
                const clientNumber = from.replace("@s.whatsapp.net", "").replace("@g.us", "");
                
                const webhookPayload = {
                  event: "poll.response",
                  connection_id: connectionId,
                  timestamp: savedMessage.timestamp.toISOString(),
                  data: {
                    message_id: savedMessage.id,
                    from: from,
                    poll_message_id: pollMessage.providerMessageId || pollMessage.id,
                    poll_question: pollMessage.pollQuestion,
                    selected_option: selectedOption,
                    chat_id: savedMessage.chatId,
                  },
                };
                
                this.deliverWebhook(webhookCallback, webhookPayload).catch(err => {
                  console.error("Background webhook delivery failed:", err);
                });
              }
            }
          }
        } catch (error) {
          console.error("Error processing poll update:", error);
        }
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
    selectableCount: number = 1,
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
          selectableCount: selectableCount,
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
        pollSelectableCount: selectableCount,
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
      try {
        await connection.socket.logout();
      } catch (error) {
        console.error(`Error logging out connection ${connectionId}:`, error);
      }
      
      this.connections.delete(connectionId);
      
      // Remove webhook callback
      this.webhookCallbacks.delete(connectionId);
      
      const sessionPath = path.join(this.sessionsPath, connectionId);
      if (fs.existsSync(sessionPath)) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (error) {
          console.error(`Error deleting session for ${connectionId}:`, error);
        }
      }

      await storage.updateConnection(connectionId, { 
        status: "disconnected",
        lastActive: new Date()
      });
    } else {
      // Connection might not be in memory, but still update database
      await storage.updateConnection(connectionId, { 
        status: "disconnected",
        lastActive: new Date()
      });
    }
  }

  async restoreAllConnections(io?: any, createWebhookCallback?: (url: string, connId: string, socketIO: any) => (data: any) => Promise<void>) {
    console.log("Restoring all WhatsApp connections...");
    const allConnections = await storage.getAllConnections();

    for (const conn of allConnections) {
      if (conn.status === "connected") {
        const sessionPath = path.join(this.sessionsPath, conn.connectionId);
        if (fs.existsSync(sessionPath)) {
          try {
            await this.createConnection(conn.connectionId);
            console.log(`Restored connection: ${conn.connectionId}`);
            
            // Restore webhook callback if webhook URL exists and callback creator is provided
            if (conn.webhookUrl && io && createWebhookCallback) {
              const webhookCallback = createWebhookCallback(conn.webhookUrl, conn.connectionId, io);
              this.registerWebhookCallback(conn.connectionId, webhookCallback);
              console.log(`Restored webhook for connection: ${conn.connectionId}`);
            }
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
