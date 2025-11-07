# WhatsApp Web Multi-User Messaging System

A complete multi-user WhatsApp Web messaging system using the Baileys library (WhatsApp Web Multi-Device). This system allows you to manage multiple WhatsApp connections, send and receive messages, and integrate with webhooks for real-time notifications.

## Features

✅ **Multi-User WhatsApp Connections**
- Connect unlimited WhatsApp accounts simultaneously
- Each user has a unique `connection_id` and isolated session storage
- QR-based authentication with `useMultiFileAuthState`
- Auto-reconnect on server restart

✅ **Real-Time Messaging**
- Send and receive WhatsApp messages
- Message tracking with `client_message_id` and `provider_message_id`
- Chat synchronization (last 50 messages per chat)
- Live updates via WebSocket (Socket.IO)

✅ **Webhook Integration**
- Configure webhook URL per connection
- Automatic webhook calls on incoming messages
- Webhook activity logging with status tracking

✅ **Admin Dashboard**
- View all connections and their status
- Scan QR codes to connect WhatsApp accounts
- Browse chat lists and message history
- Send messages directly from the dashboard
- Real-time connection status updates

✅ **Database Persistence**
- PostgreSQL database for all data
- Tables: users, connections, messages, webhook_logs
- Complete message history and audit trails

## Technology Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **@whiskeysockets/baileys** - WhatsApp Web Multi-Device library
- **Socket.IO** - Real-time WebSocket communication
- **PostgreSQL** - Database
- **Drizzle ORM** - Type-safe database operations

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** + **shadcn/ui** - Styling and components
- **TanStack Query** - Data fetching and caching
- **Socket.IO Client** - Real-time updates
- **Wouter** - Client-side routing

## Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Step 1: Clone and Install Dependencies

```bash
npm install
```

### Step 2: Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration (automatically set by Replit)
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=your-pg-host
PGPORT=5432
PGUSER=your-pg-user
PGPASSWORD=your-pg-password
PGDATABASE=your-database-name

# Session Secret (for Express sessions)
SESSION_SECRET=your-secret-key-here
```

### Step 3: Database Setup

Run migrations to create database tables:

```bash
npm run db:push
```

This will create the following tables:
- `users` - User accounts
- `connections` - WhatsApp connection metadata
- `messages` - All sent and received messages
- `webhook_logs` - Webhook call history

### Step 4: Start the Application

```bash
npm run dev
```

The application will start on `http://localhost:5000`

## API Endpoints

### Connection Management

#### Get QR Code
```http
GET /api/get-qr/:connection_id
```

Response:
```json
{
  "qr": "base64-qr-code-string",
  "connection_id": "user123",
  "status": "connecting"
}
```

#### Create Connection
```http
POST /api/connections
Content-Type: application/json

{
  "connection_id": "user123",
  "webhook_url": "https://api.example.com/webhook" // optional
}
```

#### Get All Connections
```http
GET /api/connections
```

#### Get Single Connection
```http
GET /api/connections/:connection_id
```

#### Update Webhook URL
```http
PATCH /api/connections/:connection_id/webhook
Content-Type: application/json

{
  "webhook_url": "https://api.example.com/webhook"
}
```

#### Delete Connection
```http
DELETE /api/connections/:connection_id
```

### Messaging

#### Send Message
```http
POST /api/send-message
Content-Type: application/json

{
  "connection_id": "user123",
  "to": "923001234567",
  "message": "Hello from WhatsApp API!",
  "client_message_id": "unique-client-id-001" // optional
}
```

Response:
```json
{
  "status": "sent",
  "client_message_id": "unique-client-id-001",
  "provider_message_id": "wamid-xxxxx"
}
```

#### Get Chats
```http
GET /api/chats/:connection_id
```

#### Get Messages
```http
GET /api/messages/:connection_id/:chat_id?limit=50
```

### Webhook Logs

#### Get Webhook Logs
```http
GET /api/webhook-logs/:connection_id?limit=100
```

## WebSocket Events

The system uses Socket.IO for real-time updates:

### Events Emitted by Server

**`connection-status`** - Connection status changed
```json
{
  "connectionId": "user123",
  "status": "connected",
  "phoneNumber": "+923001234567"
}
```

**`qr-update`** - New QR code generated
```json
{
  "connectionId": "user123",
  "qr": "base64-qr-code"
}
```

**`new-message`** - New message received
```json
{
  "connectionId": "user123",
  "chatId": "923001234567@s.whatsapp.net",
  "message": { ... }
}
```

**`message-sent`** - Message sent successfully
```json
{
  "connectionId": "user123",
  "chatId": "923001234567@s.whatsapp.net",
  "clientMessageId": "unique-id",
  "providerMessageId": "wamid-xxxxx"
}
```

## Webhook Integration

### Incoming Message Webhook

When a message arrives, the system calls your configured webhook URL with a POST request:

```json
{
  "from": "923001234567",
  "message": "Hello!",
  "provider_message_id": "wamid-xxxxx",
  "connection_id": "user123"
}
```

Your webhook should return a 2xx status code to indicate success.

## Session Storage

### How It Works

WhatsApp sessions are stored using Baileys' `useMultiFileAuthState` in the `./whatsapp-sessions` directory:

```
whatsapp-sessions/
├── user123/
│   ├── creds.json
│   ├── app-state-sync-key-xxxxx.json
│   └── ... (other session files)
├── user456/
│   └── ...
```

### Auto-Reconnect

When the server restarts, all previously connected WhatsApp sessions are automatically restored from the session files. The `restoreAllConnections()` function:

1. Loads all connections from the database
2. Reads session data from disk
3. Recreates WhatsApp socket connections
4. Restores event handlers

## Usage Guide

### 1. Create a Connection

1. Go to the Dashboard or Connections page
2. Click "New Connection"
3. Enter a unique connection ID (e.g., "user-123")
4. Click "Create Connection"

### 2. Scan QR Code

1. Click "Scan QR" on the connection card
2. Open WhatsApp on your phone
3. Go to Settings → Linked Devices → Link a Device
4. Scan the QR code displayed

### 3. Configure Webhook (Optional)

1. Click the settings icon on the connection card
2. Enter your webhook URL
3. Click "Save Webhook Settings"

### 4. Send Messages

#### Via Dashboard
1. Go to Messages page
2. Select your connection
3. Choose a chat
4. Type and send messages

#### Via API
```bash
curl -X POST http://localhost:5000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "user123",
    "to": "923001234567",
    "message": "Hello from API!",
    "client_message_id": "msg-001"
  }'
```

## Project Structure

```
├── server/
│   ├── db.ts                 # Database connection
│   ├── index.ts              # Express server entry
│   ├── routes.ts             # API routes
│   ├── storage.ts            # Database operations
│   └── whatsapp/
│       └── whatsappService.ts # Baileys integration
├── client/
│   └── src/
│       ├── components/       # React components
│       ├── pages/           # Page components
│       ├── lib/             # API client & utilities
│       └── App.tsx          # Main app component
├── shared/
│   └── schema.ts            # Database schema (Drizzle)
└── migrations/              # Database migrations
```

## Event Handlers

The Baileys service implements three key event handlers:

### 1. `connection.update`
Handles connection state changes (connecting, open, close) and QR code updates.

### 2. `messages.upsert`
Processes incoming messages, saves to database, and triggers webhooks.

### 3. `creds.update`
Saves authentication credentials to disk for session persistence.

## Error Handling

- All API endpoints return proper HTTP status codes
- Errors are logged to console with context
- Failed webhook calls are logged to `webhook_logs` table
- Auto-retry logic for WhatsApp disconnections

## Troubleshooting

### QR Code Not Generating
- Check that the connection exists in the database
- Verify session folder permissions
- Check server logs for Baileys errors

### Messages Not Sending
- Ensure connection status is "connected"
- Verify phone number format (with country code, no special characters)
- Check WhatsApp rate limits

### Webhook Not Working
- Verify webhook URL is accessible
- Check webhook logs in database
- Ensure your server can make outbound HTTP requests

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Database Commands
```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:push

# Open Drizzle Studio (DB GUI)
npm run db:studio
```

## Security Notes

- Store `SESSION_SECRET` securely
- Use HTTPS for webhook URLs in production
- Implement authentication for API endpoints
- Rate limit API requests
- Validate webhook payloads

## License

MIT

## Support

For issues or questions, please check the Baileys documentation:
https://whiskeysockets.github.io/Baileys/

---

**Built with ❤️ using Baileys, Express, React, and PostgreSQL**
