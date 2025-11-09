import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { whatsappService } from "./whatsapp/whatsappService";
import { z } from "zod";
import axios from "axios";
import { validateApiToken } from "./middleware/validateApiToken";
import { buttonsDataSchema } from "@shared/schema";
import { generateApiToken, hashApiToken } from "./utils/apiToken";

const sendMessageSchema = z.object({
  connection_id: z.string(),
  to: z.string(),
  message: z.string(),
  client_message_id: z.string().optional(),
  media_url: z.string().optional(),
  media_type: z.enum(["image", "video", "audio", "document"]).optional(),
  file_name: z.string().optional(),
  mimetype: z.string().optional(),
  product_url: z.string().url().optional(),
});

const createConnectionSchema = z.object({
  connection_id: z.string(),
  webhook_url: z.string().url().optional(),
});

const updateWebhookSchema = z.object({
  webhook_url: z.string().url(),
});

const sendTextSchema = z.object({
  connection_id: z.string(),
  to: z.string(),
  message: z.string(),
  message_id: z.string().optional(),
});

const sendImageSchema = z.object({
  connection_id: z.string(),
  to: z.string(),
  image_url: z.string(),
  caption: z.string().optional(),
  message_id: z.string().optional(),
});

const sendLinkSchema = z.object({
  connection_id: z.string(),
  to: z.string(),
  message: z.string(),
  link: z.string().url(),
  message_id: z.string().optional(),
});

const sendButtonsSchema = z.object({
  connection_id: z.string(),
  to: z.string(),
  text: z.string(),
  footer: z.string().optional(),
  buttons: z.array(z.object({
    id: z.string(),
    title: z.string().max(20),
  })).min(1).max(3),
  message_id: z.string().optional(),
});

const updateApiTokenSchema = z.object({
  api_token: z.string().optional(),
  generate_new: z.boolean().optional(),
});

function createWebhookCallback(webhookUrl: string, connectionId: string, io: SocketIOServer) {
  return async (data: any) => {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(webhookUrl, data, {
          headers: { 
            "Content-Type": "application/json",
            "X-Webhook-Attempt": attempt.toString(),
            "X-Connection-ID": connectionId,
          },
          timeout: 10000,
        });

        await storage.createWebhookLog({
          connectionId: connectionId,
          messageId: null,
          webhookUrl: webhookUrl,
          payload: JSON.stringify(data),
          statusCode: response.status,
          response: JSON.stringify(response.data),
          error: attempt > 1 ? `Success on attempt ${attempt}` : null,
        });
        
        io.emit("webhook-delivered", {
          connectionId: connectionId,
          success: true,
          attempt,
        });
        
        return;
      } catch (error) {
        const errorMessage = (error as Error).message;
        const statusCode = (error as any)?.response?.status || null;
        const responseData = (error as any)?.response?.data;
        
        console.error(`Webhook attempt ${attempt}/${maxRetries} failed:`, errorMessage);
        
        await storage.createWebhookLog({
          connectionId: connectionId,
          messageId: null,
          webhookUrl: webhookUrl,
          payload: JSON.stringify(data),
          statusCode,
          response: responseData ? JSON.stringify(responseData) : null,
          error: `Attempt ${attempt}/${maxRetries}: ${errorMessage}`,
        });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        } else {
          io.emit("webhook-failed", {
            connectionId: connectionId,
            success: false,
            attempts: maxRetries,
            error: errorMessage,
          });
        }
      }
    }
  };
}

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

  app.post("/api/send-message", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendMessageSchema.parse(req.body);

      const { connection_id, to, message, client_message_id, media_url, media_type, file_name, mimetype, product_url } = validatedData;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Connection not active" });
      }

      let finalMessage = message;
      if (product_url) {
        finalMessage = message ? `${message}\n\n${product_url}` : product_url;
      }

      const result = await whatsappService.sendMessage(
        connection_id,
        to,
        finalMessage,
        client_message_id,
        media_url,
        media_type,
        file_name,
        mimetype
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

  app.post("/api/send-text", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendTextSchema.parse(req.body);
      const { connection_id, to, message, message_id } = validatedData;

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
        message_id
      );

      if (result.success) {
        return res.json({
          status: "sent",
          message_id: message_id || null,
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
      console.error("Error sending text:", error);
      res.status(500).json({
        error: "Failed to send text message",
        message: (error as Error).message,
      });
    }
  });

  app.post("/api/send-image", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendImageSchema.parse(req.body);
      const { connection_id, to, image_url, caption, message_id } = validatedData;

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
        caption || "",
        message_id,
        image_url,
        "image"
      );

      if (result.success) {
        return res.json({
          status: "sent",
          message_id: message_id || null,
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
      console.error("Error sending image:", error);
      res.status(500).json({
        error: "Failed to send image",
        message: (error as Error).message,
      });
    }
  });

  app.post("/api/send-link", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendLinkSchema.parse(req.body);
      const { connection_id, to, message, link, message_id } = validatedData;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Connection not active" });
      }

      const fullMessage = `${message}\n\n${link}`;

      const result = await whatsappService.sendMessage(
        connection_id,
        to,
        fullMessage,
        message_id
      );

      if (result.success) {
        return res.json({
          status: "sent",
          message_id: message_id || null,
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
      console.error("Error sending link:", error);
      res.status(500).json({
        error: "Failed to send link",
        message: (error as Error).message,
      });
    }
  });

  app.post("/api/send-buttons", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendButtonsSchema.parse(req.body);
      const { connection_id, to, text, footer, buttons, message_id } = validatedData;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Connection not active" });
      }

      const result = await whatsappService.sendButtons(
        connection_id,
        to,
        text,
        buttons,
        footer,
        message_id
      );

      if (result.success) {
        return res.json({
          status: "sent",
          message_id: message_id || null,
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
      console.error("Error sending buttons:", error);
      res.status(500).json({
        error: "Failed to send interactive buttons",
        message: (error as Error).message,
      });
    }
  });

  const sendUnifiedSchema = z.object({
    connection_id: z.string(),
    to: z.string(),
    text: z.string().optional(),
    image_url: z.string().url().optional(),
    link: z.string().url().optional(),
    message_id: z.string().optional(),
  });

  app.post("/api/send-unified", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendUnifiedSchema.parse(req.body);
      const { connection_id, to, text, image_url, link, message_id } = validatedData;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Connection not active" });
      }

      let result;

      if (image_url) {
        result = await whatsappService.sendMessage(
          connection_id,
          to,
          text || "",
          message_id,
          image_url,
          "image"
        );
      } else if (link && text) {
        const fullMessage = `${text}\n\n${link}`;
        result = await whatsappService.sendMessage(
          connection_id,
          to,
          fullMessage,
          message_id
        );
      } else if (text) {
        result = await whatsappService.sendMessage(
          connection_id,
          to,
          text,
          message_id
        );
      } else {
        return res.status(400).json({ error: "At least one of text, image_url, or link is required" });
      }

      if (result.success) {
        return res.json({
          status: "sent",
          message_id: message_id || null,
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
      console.error("Error sending unified message:", error);
      res.status(500).json({
        error: "Failed to send message",
        message: (error as Error).message,
      });
    }
  });

  const sendPollSchema = z.object({
    connection_id: z.string(),
    to: z.string(),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(12),
    message_id: z.string().optional(),
  });

  app.post("/api/send-poll", validateApiToken, async (req, res) => {
    try {
      const validatedData = sendPollSchema.parse(req.body);
      const { connection_id, to, question, options, message_id } = validatedData;

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Connection not active" });
      }

      const result = await whatsappService.sendPoll(
        connection_id,
        to,
        question,
        options,
        message_id
      );

      if (result.success) {
        return res.json({
          status: "sent",
          message_id: message_id || null,
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
      console.error("Error sending poll:", error);
      res.status(500).json({
        error: "Failed to send poll",
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

      if (validatedData.webhook_url) {
        const webhookCallback = createWebhookCallback(validatedData.webhook_url, validatedData.connection_id, io);
        whatsappService.registerWebhookCallback(validatedData.connection_id, webhookCallback);
      }

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

      const webhookCallback = createWebhookCallback(validatedData.webhook_url, connection_id, io);
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

  app.patch("/api/connections/:connection_id/api-token", async (req, res) => {
    try {
      const { connection_id } = req.params;
      const validatedData = updateApiTokenSchema.parse(req.body);

      const connection = await storage.getConnection(connection_id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      let updatedConnection;
      let newToken: string | null = null;

      if (validatedData.generate_new) {
        const { token, hash } = generateApiToken();
        updatedConnection = await storage.updateConnection(connection_id, {
          apiToken: hash,
        });
        newToken = token;
      } else if (validatedData.api_token === null || validatedData.api_token === "") {
        updatedConnection = await storage.updateConnection(connection_id, {
          apiToken: null,
        });
      } else if (validatedData.api_token) {
        const hash = hashApiToken(validatedData.api_token);
        updatedConnection = await storage.updateConnection(connection_id, {
          apiToken: hash,
        });
      } else {
        return res.status(400).json({ error: "Invalid request: provide generate_new or api_token" });
      }

      const response: any = {
        connection_id: connection_id,
        message: newToken 
          ? "API token generated successfully" 
          : validatedData.api_token === null 
            ? "API token removed successfully"
            : "API token updated successfully",
      };

      if (newToken) {
        response.api_token = newToken;
        response.warning = "Save this token securely. It cannot be retrieved again.";
      }

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating API token:", error);
      res.status(500).json({
        error: "Failed to update API token",
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
        mediaType: msg.mediaType,
        mediaUrl: msg.mediaUrl,
        mediaMetadata: msg.mediaMetadata ? JSON.parse(msg.mediaMetadata) : null,
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

  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        error: "Failed to fetch stats",
        message: (error as Error).message,
      });
    }
  });

  await whatsappService.restoreAllConnections();

  const allConnections = await storage.getAllConnections();
  for (const conn of allConnections) {
    if (conn.webhookUrl) {
      const webhookCallback = createWebhookCallback(conn.webhookUrl, conn.connectionId, io);
      whatsappService.registerWebhookCallback(conn.connectionId, webhookCallback);
      console.log(`Registered webhook for connection: ${conn.connectionId}`);
    }
  }

  return httpServer;
}
