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
  pollQuestion: text("poll_question"),
  pollOptions: jsonb("poll_options"),
  pollSelectableCount: integer("poll_selectable_count").default(1),
  pollResponseOption: text("poll_response_option"),
  pollResponseMessageId: varchar("poll_response_message_id").references((): any => messages.id),
  quotedMessageId: varchar("quoted_message_id").references((): any => messages.id),
  buttonResponseId: text("button_response_id"),
  buttonPayload: text("button_payload"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  connectionReadIdx: index("messages_connection_read_idx").on(table.connectionId, table.isRead),
  quotedMessageIdx: index("messages_quoted_message_idx").on(table.quotedMessageId),
  pollResponseMessageIdx: index("messages_poll_response_idx").on(table.pollResponseMessageId),
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

export const sendTextPayloadSchema = z.object({
  kind: z.literal("text"),
  message: z.string().min(1),
});

export const sendImagePayloadSchema = z.object({
  kind: z.literal("image"),
  image_url: z.string().url(),
  caption: z.string().optional(),
});

export const sendLinkPayloadSchema = z.object({
  kind: z.literal("link"),
  message: z.string().min(1),
  link: z.string().url(),
});

export const sendButtonsPayloadSchema = z.object({
  kind: z.literal("buttons"),
  text: z.string().min(1),
  footer: z.string().optional(),
  buttons: z.array(replyButtonSchema).min(1).max(3),
});

export const sendPollPayloadSchema = z.object({
  kind: z.literal("poll"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(12),
  selectable_count: z.number().int().min(1).optional().default(1),
  message_id: z.string().optional(),
});

export const sendPayloadSchema = z.discriminatedUnion("kind", [
  sendTextPayloadSchema,
  sendImagePayloadSchema,
  sendLinkPayloadSchema,
  sendButtonsPayloadSchema,
  sendPollPayloadSchema,
]);

export type SendTextPayload = z.infer<typeof sendTextPayloadSchema>;
export type SendImagePayload = z.infer<typeof sendImagePayloadSchema>;
export type SendLinkPayload = z.infer<typeof sendLinkPayloadSchema>;
export type SendButtonsPayload = z.infer<typeof sendButtonsPayloadSchema>;
export type SendPollPayload = z.infer<typeof sendPollPayloadSchema>;
export type SendPayload = z.infer<typeof sendPayloadSchema>;
