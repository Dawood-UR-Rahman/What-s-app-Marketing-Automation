import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: text("connection_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  phoneNumber: text("phone_number"),
  webhookUrl: text("webhook_url"),
  apiToken: text("api_token"),
  status: text("status").notNull().default("disconnected"),
  qrCode: text("qr_code"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
});

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: text("connection_id").notNull().references(() => connections.connectionId),
  chatId: text("chat_id").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  messageBody: text("message_body").notNull(),
  clientMessageId: text("client_message_id"),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("sent"),
  isSent: boolean("is_sent").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  mediaType: text("media_type"),
  mediaUrl: text("media_url"),
  mediaMetadata: text("media_metadata"),
  buttonType: text("button_type"),
  buttonsData: jsonb("buttons_data"),
  quotedMessageId: varchar("quoted_message_id").references((): any => messages.id),
  buttonResponseId: text("button_response_id"),
  buttonPayload: text("button_payload"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  connectionReadIdx: index("messages_connection_read_idx").on(table.connectionId, table.isRead),
  quotedMessageIdx: index("messages_quoted_message_idx").on(table.quotedMessageId),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: text("connection_id").notNull().references(() => connections.connectionId),
  messageId: varchar("message_id").references(() => messages.id),
  webhookUrl: text("webhook_url").notNull(),
  payload: text("payload").notNull(),
  statusCode: integer("status_code"),
  response: text("response"),
  error: text("error"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

export const replyButtonSchema = z.object({
  id: z.string(),
  title: z.string().max(20),
});

export const buttonsDataSchema = z.object({
  text: z.string(),
  footer: z.string().optional(),
  buttons: z.array(replyButtonSchema).min(1).max(3),
});

export type ReplyButton = z.infer<typeof replyButtonSchema>;
export type ButtonsData = z.infer<typeof buttonsDataSchema>;
