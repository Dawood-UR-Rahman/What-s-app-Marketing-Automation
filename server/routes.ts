import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { whatsappService } from "./whatsapp/whatsappService";
import { z } from "zod";
import axios from "axios";

const sendMessageSchema = z.object({
  connection_id: z.string(),
  to: z.string(),
  message: z.string(),
  client_message_id: z.string().optional(),
  media_url: z.string().optional(),
  media_type: z.enum(["image", "video", "audio", "document"]).optional(),
});

const createConnectionSchema = z.object({
  connection_id: z.string(),
  webhook_url: z.string().url().optional(),
});

const updateWebhookSchema = z.object({
  webhook_url: z.string().url(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  whatsappService.setSocketIO(io);

  io.on("connection", (socket) => {
    console.log("WebSocket client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("WebSocket client disconnected:", socket.id);
    });
  });

  app.get("/api/get-qr/:connection_id", async (req, res) => {
    try {
      const { connection_id } = req.params;

      let connection = await storage.getConnection(connection_id);
      
      if (!connection) {
        connection = await storage.createConnection({
          connectionId: connection_id,
          userId: null,
          phoneNumber: null,
          webhookUrl: null,
          status: "connecting",
          qrCode: null,
          lastActive: new Date(),
        });
      }

      const waConnection = await whatsappService.createConnection(connection_id);

      if (waConnection.qrCode) {
        return res.json({
          qr: waConnection.qrCode,
          connection_id: connection_id,
          status: waConnection.status,
        });
      }

      const qrCode = await new Promise<string | null>((resolve) => {
        let responded = false;

        const timeout = setTimeout(() => {
          if (!responded) {
            responded = true;
            clearInterval(checkQR);
            resolve(null);
          }
        }, 30000);

        const checkQR = setInterval(() => {
          const conn = whatsappService.getConnection(connection_id);
          if (conn?.qrCode && !responded) {
            responded = true;
            clearTimeout(timeout);
            clearInterval(checkQR);
            resolve(conn.qrCode);
          }
        }, 500);
      });

      if (qrCode) {
        const conn = whatsappService.getConnection(connection_id);
        return res.json({
          qr: qrCode,
          connection_id: connection_id,
          status: conn?.status || "connecting",
        });
      } else {
        return res.json({
          message: "QR code not available yet. Please try again or use WebSocket for real-time updates.",
          connection_id: connection_id,
          status: "connecting",
        });
      }

    } catch (error) {
      console.error("Error getting QR code:", error);
      res.status(500).json({
        error: "Failed to generate QR code",
        message: (error as Error).message,
      });
    }
  });

  app.post("/api/send-message", async (req, res) => {
    try {
      const validatedData = sendMessageSchema.parse(req.body);

      const { connection_id, to, message, client_message_id, media_url, media_type } = validatedData;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Connection not active" });
      }

      const result = await whatsappService.sendMessage(
        connection_id,
        to,
        message,
        client_message_id,
        media_url,
        media_type
      );

      if (result.success) {
        return res.json({
          status: "sent",
          client_message_id: client_message_id || null,
          provider_message_id: result.providerMessageId,
        });
      } else {
        return res.status(500).json({
          status: "failed",
          error: result.error,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error sending message:", error);
      res.status(500).json({
        error: "Failed to send message",
        message: (error as Error).message,
      });
    }
  });

  app.post("/api/connections", async (req, res) => {
    try {
      const validatedData = createConnectionSchema.parse(req.body);

      const existingConnection = await storage.getConnection(validatedData.connection_id);
      if (existingConnection) {
        return res.status(400).json({ error: "Connection ID already exists" });
      }

      const connection = await storage.createConnection({
        connectionId: validatedData.connection_id,
        userId: null,
        phoneNumber: null,
        webhookUrl: validatedData.webhook_url || null,
        status: "disconnected",
        qrCode: null,
        lastActive: new Date(),
      });

      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error creating connection:", error);
      res.status(500).json({
        error: "Failed to create connection",
        message: (error as Error).message,
      });
    }
  });

  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getAllConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({
        error: "Failed to fetch connections",
        message: (error as Error).message,
      });
    }
  });

  app.get("/api/connections/:connection_id", async (req, res) => {
    try {
      const { connection_id } = req.params;
      const connection = await storage.getConnection(connection_id);

      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json(connection);
    } catch (error) {
      console.error("Error fetching connection:", error);
      res.status(500).json({
        error: "Failed to fetch connection",
        message: (error as Error).message,
      });
    }
  });

  app.patch("/api/connections/:connection_id/webhook", async (req, res) => {
    try {
      const { connection_id } = req.params;
      const validatedData = updateWebhookSchema.parse(req.body);

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const updatedConnection = await storage.updateConnection(connection_id, {
        webhookUrl: validatedData.webhook_url,
      });

      const webhookCallback = async (data: any) => {
        try {
          const response = await axios.post(validatedData.webhook_url, data, {
            headers: { "Content-Type": "application/json" },
            timeout: 10000,
          });

          await storage.createWebhookLog({
            connectionId: connection_id,
            messageId: null,
            webhookUrl: validatedData.webhook_url,
            payload: JSON.stringify(data),
            statusCode: response.status,
            response: JSON.stringify(response.data),
            error: null,
          });
        } catch (error) {
          console.error("Webhook call failed:", error);
          await storage.createWebhookLog({
            connectionId: connection_id,
            messageId: null,
            webhookUrl: validatedData.webhook_url,
            payload: JSON.stringify(data),
            statusCode: null,
            response: null,
            error: (error as Error).message,
          });
        }
      };

      whatsappService.registerWebhookCallback(connection_id, webhookCallback);

      res.json(updatedConnection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating webhook:", error);
      res.status(500).json({
        error: "Failed to update webhook",
        message: (error as Error).message,
      });
    }
  });

  app.delete("/api/connections/:connection_id", async (req, res) => {
    try {
      const { connection_id } = req.params;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      await whatsappService.disconnectConnection(connection_id);
      await storage.deleteConnection(connection_id);

      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({
        error: "Failed to delete connection",
        message: (error as Error).message,
      });
    }
  });

  app.get("/api/chats/:connection_id", async (req, res) => {
    try {
      const { connection_id } = req.params;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const chats = await storage.getChatsForConnection(connection_id);

      const formattedChats = chats.map((chat) => ({
        chatId: chat.chatId,
        name: chat.lastMessage.from.replace("@s.whatsapp.net", ""),
        phoneNumber: chat.lastMessage.from.replace("@s.whatsapp.net", ""),
        lastMessage: chat.lastMessage.messageBody,
        timestamp: chat.lastMessage.timestamp,
        unreadCount: 0,
      }));

      res.json(formattedChats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({
        error: "Failed to fetch chats",
        message: (error as Error).message,
      });
    }
  });

  app.get("/api/messages/:connection_id/:chat_id", async (req, res) => {
    try {
      const { connection_id, chat_id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const messages = await storage.getMessagesByConnectionAndChat(
        connection_id,
        chat_id,
        limit
      );

      const formattedMessages = messages.reverse().map((msg) => ({
        id: msg.id,
        content: msg.messageBody,
        timestamp: msg.timestamp,
        isSent: msg.isSent,
        status: msg.status,
        clientMessageId: msg.clientMessageId,
        providerMessageId: msg.providerMessageId,
      }));

      res.json(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({
        error: "Failed to fetch messages",
        message: (error as Error).message,
      });
    }
  });

  app.get("/api/webhook-logs/:connection_id", async (req, res) => {
    try {
      const { connection_id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const logs = await storage.getWebhookLogs(connection_id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({
        error: "Failed to fetch webhook logs",
        message: (error as Error).message,
      });
    }
  });

  await whatsappService.restoreAllConnections();

  return httpServer;
}
