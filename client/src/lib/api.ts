import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Connection {
  id: string;
  connectionId: string;
  userId: string | null;
  phoneNumber: string | null;
  webhookUrl: string | null;
  status: string;
  qrCode: string | null;
  lastActive: Date | null;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isSent: boolean;
  status: string;
  clientMessageId: string | null;
  providerMessageId: string | null;
}

export interface Chat {
  chatId: string;
  name: string;
  phoneNumber: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
}

export const connectionsApi = {
  async getAll(): Promise<Connection[]> {
    const response = await api.get("/api/connections");
    return response.data;
  },

  async getOne(connectionId: string): Promise<Connection> {
    const response = await api.get(`/api/connections/${connectionId}`);
    return response.data;
  },

  async create(connectionId: string, webhookUrl?: string): Promise<Connection> {
    const response = await api.post("/api/connections", {
      connection_id: connectionId,
      webhook_url: webhookUrl,
    });
    return response.data;
  },

  async updateWebhook(connectionId: string, webhookUrl: string): Promise<Connection> {
    const response = await api.patch(`/api/connections/${connectionId}/webhook`, {
      webhook_url: webhookUrl,
    });
    return response.data;
  },

  async delete(connectionId: string): Promise<void> {
    await api.delete(`/api/connections/${connectionId}`);
  },

  async getQR(connectionId: string): Promise<{ qr?: string; status: string; connection_id: string }> {
    const response = await api.get(`/api/get-qr/${connectionId}`);
    return response.data;
  },
};

export const messagesApi = {
  async send(
    connectionId: string,
    to: string,
    message: string,
    clientMessageId?: string
  ): Promise<{ status: string; client_message_id: string | null; provider_message_id?: string }> {
    const response = await api.post("/api/send-message", {
      connection_id: connectionId,
      to,
      message,
      client_message_id: clientMessageId,
    });
    return response.data;
  },

  async getMessages(connectionId: string, chatId: string, limit: number = 50): Promise<Message[]> {
    const response = await api.get(`/api/messages/${connectionId}/${chatId}`, {
      params: { limit },
    });
    return response.data;
  },
};

export const chatsApi = {
  async getChats(connectionId: string): Promise<Chat[]> {
    const response = await api.get(`/api/chats/${connectionId}`);
    return response.data;
  },
};

export const webhookLogsApi = {
  async getLogs(connectionId: string, limit: number = 100) {
    const response = await api.get(`/api/webhook-logs/${connectionId}`, {
      params: { limit },
    });
    return response.data;
  },
};
