import { 
  type User, 
  type InsertUser,
  type Connection,
  type InsertConnection,
  type Message,
  type InsertMessage,
  type WebhookLog,
  type InsertWebhookLog,
  connections,
  messages,
  webhookLogs,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createConnection(connection: InsertConnection): Promise<Connection>;
  getConnection(connectionId: string): Promise<Connection | undefined>;
  getConnectionById(id: string): Promise<Connection | undefined>;
  getAllConnections(): Promise<Connection[]>;
  updateConnection(connectionId: string, data: Partial<Connection>): Promise<Connection | undefined>;
  deleteConnection(connectionId: string): Promise<boolean>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessageByProviderId(providerMessageId: string): Promise<Message | undefined>;
  getMessagesByConnectionAndChat(connectionId: string, chatId: string, limit?: number): Promise<Message[]>;
  getChatsForConnection(connectionId: string): Promise<Array<{chatId: string; lastMessage: Message}>>;
  updateMessageStatus(id: string, status: string): Promise<Message | undefined>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  markChatMessagesAsRead(connectionId: string, chatId: string): Promise<void>;
  getUnreadCountForChat(connectionId: string, chatId: string): Promise<number>;
  getTotalUnreadCount(connectionId: string): Promise<number>;
  
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  getWebhookLogs(connectionId: string, limit?: number): Promise<WebhookLog[]>;
  
  getDashboardStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalWebhookCalls: number;
  }>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const result = await db.insert(connections).values(connection).returning();
    return result[0];
  }

  async getConnection(connectionId: string): Promise<Connection | undefined> {
    const result = await db
      .select()
      .from(connections)
      .where(eq(connections.connectionId, connectionId))
      .limit(1);
    return result[0];
  }

  async getConnectionById(id: string): Promise<Connection | undefined> {
    const result = await db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);
    return result[0];
  }

  async getAllConnections(): Promise<Connection[]> {
    return await db.select().from(connections);
  }

  async updateConnection(connectionId: string, data: Partial<Connection>): Promise<Connection | undefined> {
    const result = await db
      .update(connections)
      .set(data)
      .where(eq(connections.connectionId, connectionId))
      .returning();
    return result[0];
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    const result = await db
      .delete(connections)
      .where(eq(connections.connectionId, connectionId))
      .returning();
    return result.length > 0;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return result[0];
  }

  async getMessageByProviderId(providerMessageId: string): Promise<Message | undefined> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.providerMessageId, providerMessageId))
      .limit(1);
    return result[0];
  }

  async getMessagesByConnectionAndChat(
    connectionId: string,
    chatId: string,
    limit: number = 50
  ): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.connectionId, connectionId), eq(messages.chatId, chatId)))
      .orderBy(desc(messages.timestamp))
      .limit(limit);
  }

  async getChatsForConnection(connectionId: string): Promise<Array<{chatId: string; lastMessage: Message}>> {
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.connectionId, connectionId))
      .orderBy(desc(messages.timestamp));

    const chatMap = new Map<string, Message>();
    for (const msg of allMessages) {
      if (!chatMap.has(msg.chatId)) {
        chatMap.set(msg.chatId, msg);
      }
    }

    return Array.from(chatMap.entries()).map(([chatId, lastMessage]) => ({
      chatId,
      lastMessage,
    }));
  }

  async updateMessageStatus(id: string, status: string): Promise<Message | undefined> {
    const result = await db
      .update(messages)
      .set({ status })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const result = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async markChatMessagesAsRead(connectionId: string, chatId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.connectionId, connectionId),
          eq(messages.chatId, chatId),
          eq(messages.isSent, false),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadCountForChat(connectionId: string, chatId: string): Promise<number> {
    const unreadMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.connectionId, connectionId),
          eq(messages.chatId, chatId),
          eq(messages.isSent, false),
          eq(messages.isRead, false)
        )
      );
    return unreadMessages.length;
  }

  async getTotalUnreadCount(connectionId: string): Promise<number> {
    const unreadMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.connectionId, connectionId),
          eq(messages.isSent, false),
          eq(messages.isRead, false)
        )
      );
    return unreadMessages.length;
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const result = await db.insert(webhookLogs).values(log).returning();
    return result[0];
  }

  async getWebhookLogs(connectionId: string, limit: number = 100): Promise<WebhookLog[]> {
    return await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.connectionId, connectionId))
      .orderBy(desc(webhookLogs.timestamp))
      .limit(limit);
  }

  async getDashboardStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalWebhookCalls: number;
  }> {
    const allConnections = await db.select().from(connections);
    const totalConnections = allConnections.length;
    const activeConnections = allConnections.filter(c => c.status === "connected").length;

    const allMessages = await db.select().from(messages);
    const totalMessagesSent = allMessages.filter(m => m.isSent).length;
    const totalMessagesReceived = allMessages.filter(m => !m.isSent).length;

    const allWebhookLogs = await db.select().from(webhookLogs);
    const totalWebhookCalls = allWebhookLogs.length;

    return {
      totalConnections,
      activeConnections,
      totalMessagesSent,
      totalMessagesReceived,
      totalWebhookCalls,
    };
  }
}

export const storage = new DbStorage();
