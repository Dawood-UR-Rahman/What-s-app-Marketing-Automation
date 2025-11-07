CREATE TABLE "connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" text NOT NULL,
	"user_id" varchar,
	"phone_number" text,
	"webhook_url" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"qr_code" text,
	"last_active" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connections_connection_id_unique" UNIQUE("connection_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"message_body" text NOT NULL,
	"client_message_id" text,
	"provider_message_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"is_sent" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" text NOT NULL,
	"message_id" varchar,
	"webhook_url" text NOT NULL,
	"payload" text NOT NULL,
	"status_code" integer,
	"response" text,
	"error" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_connection_id_connections_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("connection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_connection_id_connections_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("connection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;