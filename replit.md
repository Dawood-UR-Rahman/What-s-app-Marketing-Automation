# WhatsApp Web Multi-User Messaging System

## Overview

This application is a complete multi-user WhatsApp Web messaging system built using the Baileys library (WhatsApp Web Multi-Device API). It enables management of multiple WhatsApp connections simultaneously, allowing users to send and receive messages, configure webhooks for incoming message notifications, and view chat histories through a modern web-based admin dashboard.

The system supports unlimited concurrent WhatsApp account connections, each with isolated session storage and QR-based authentication. It provides real-time updates via WebSocket communication and maintains complete message history and audit trails in a PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 2025)

### Poll Message System Enhancements
- **Poll Display**: Polls now show in clean, bordered boxes with numbered options and clear question headers
- **Poll Responses**: When users respond to polls, their selected option is displayed with a check icon in a visually distinct format
- **Design Consistency**: Both polls and responses follow shadcn design patterns with primary color accents

### Unread Message Tracking
- **Server-Side Calculation**: Implemented three new storage methods to calculate unread counts:
  - `getUnreadCountForChat()` - Returns unread count for a specific chat
  - `getTotalUnreadCount()` - Returns total unread across all chats for a connection
  - `markChatMessagesAsRead()` - Marks all messages in a chat as read
- **API Updates**: `/api/chats` endpoint now returns accurate unread counts instead of hardcoded 0
- **Mark as Read**: New PATCH endpoint `/api/messages/:connection_id/:chat_id/mark-read` automatically called when viewing chats
- **Real-Time Updates**: Messages are marked as read both when opening a chat AND when new messages arrive in the currently active chat

### Global WebSocket Provider
- **Architecture Change**: Moved Socket.IO connection from Messages page to App level
- **SocketProvider Context**: Created `client/src/contexts/SocketContext.tsx` wrapping entire application
- **Global Access**: All components can now access the WebSocket connection via `useSocket()` hook
- **Real-Time Sync**: Enables real-time updates across all pages (Dashboard, Messages, Connections, etc.)

### Unread Message Counters
- **Sidebar Badge**: Messages navigation item shows total unread count badge (green, updates in real-time)
- **Chat List**: Each chat shows its individual unread count
- **Live Updates**: Counters update immediately via WebSocket events when new messages arrive or are marked as read

### Developer Documentation
- **New Route**: `/developer-docs` page with comprehensive API documentation
- **Tabbed Interface**: Five sections organized in tabs:
  - **Overview**: Getting started guide, base URL, quick start steps, and feature list
  - **Authentication**: API token generation and usage guide
  - **API Endpoints**: Complete documentation of all REST endpoints with request/response examples
  - **Webhooks**: Webhook configuration, payload structure, and callback examples for messages, polls, and buttons
  - **WebSockets**: Real-time event documentation with Socket.IO connection examples
- **Code Examples**: Includes curl commands, Node.js snippets, and Python examples
- **Integration Ready**: Designed to help developers integrate with the WhatsApp Manager API

## System Architecture

### Multi-User Connection Architecture

**Problem**: Support multiple WhatsApp accounts running simultaneously on a single server instance.

**Solution**: Each connection is identified by a unique `connection_id` and has isolated session storage using Baileys' `useMultiFileAuthState`. Sessions are stored in separate directories under `./whatsapp-sessions/{connection_id}`.

**Design Decisions**:
- In-memory Map (`WhatsAppService.connections`) stores active WebSocket connections
- Each connection maintains its own Baileys socket instance with independent authentication state
- Auto-reconnection logic handles server restarts by restoring all sessions from the database
- Connection status (connecting/connected/disconnected) is tracked and synchronized with the database

**Trade-offs**: 
- Pros: Simple to implement, each connection fully isolated, no cross-talk between accounts
- Cons: All connections held in memory; scaling requires horizontal distribution with session affinity

### Authentication & Session Management

**Problem**: Authenticate WhatsApp accounts without requiring phone number/password login.

**Solution**: QR code-based authentication using Baileys Multi-Device API. Sessions persist to disk using `useMultiFileAuthState`.

**Implementation**:
- QR codes are generated when a client initiates connection
- Real-time QR updates broadcast via Socket.IO when QR refreshes
- Authenticated session credentials stored in file system (`./whatsapp-sessions/{connection_id}/creds.json`)
- Sessions automatically restored on server restart by reading stored credentials

### Real-Time Communication Layer

**Problem**: Provide instant updates to the web dashboard for connection status changes, new messages, and QR code updates.

**Solution**: Socket.IO WebSocket server running alongside Express HTTP server.

**Event Types**:
- `connection-status`: Broadcasts when a WhatsApp connection state changes (connected/disconnected)
- `qr-update`: Sends new QR codes to clients when they're generated or refreshed
- `new-message`: Notifies clients when incoming messages are received

**Architecture**: Single Socket.IO server instance shared across all WhatsApp connections via `whatsappService.setSocketIO(io)`. Events are emitted globally to all connected web clients.

### Message Processing & Storage

**Problem**: Track messages bidirectionally with both client-side and provider-side identifiers, maintain chat history, and support message status tracking.

**Solution**: PostgreSQL database with Drizzle ORM managing four core tables:

**Schema Design**:
- `connections`: Stores connection metadata (connectionId, userId, phoneNumber, webhookUrl, status, qrCode, lastActive)
- `messages`: Full message records with dual identifiers (clientMessageId from API calls, providerMessageId from WhatsApp)
- `users`: User accounts (currently minimal, extensible for multi-tenant scenarios)
- `webhook_logs`: Audit trail of webhook delivery attempts with status tracking

**Message Flow**:
1. Incoming messages: Received via Baileys event handlers → stored in DB → webhook triggered (if configured) → broadcast via Socket.IO
2. Outgoing messages: API call with clientMessageId → sent via Baileys → providerMessageId captured from response → both IDs stored in DB

### Webhook Integration Architecture

**Problem**: Enable external systems to receive real-time notifications of incoming WhatsApp messages.

**Solution**: Configurable webhook URLs per connection with automatic HTTP POST delivery.

**Implementation**:
- Each connection can configure a webhook URL in the database
- When incoming messages arrive, system makes HTTP POST to webhook URL with message payload
- Webhook delivery attempts logged to `webhook_logs` table with status (success/failure)
- Async webhook calls (non-blocking) to prevent message processing delays

**Payload Structure**: Contains message metadata (connectionId, chatId, from, to, messageBody, timestamp, providerMessageId)

### Frontend Architecture

**Framework**: React with TypeScript, using functional components and hooks exclusively.

**State Management**:
- TanStack Query (React Query) for server state caching and synchronization
- Local component state with useState for UI state
- No global state management library (Redux/Zustand) — queries handle data fetching and caching

**Real-Time Updates**:
- Global SocketProvider (`contexts/SocketContext.tsx`) wraps entire application
- Socket.IO connection initialized once at App level and shared via React Context
- All components access socket via `useSocket()` hook
- Query cache invalidation triggered by Socket.IO events to refetch updated data
- Real-time sync works across all pages (not just Messages page)

**Routing**: Wouter library for client-side routing (lightweight alternative to React Router)

**Key Pages**:
- `/` (Dashboard): Metrics overview and quick access to connections
- `/messages`: Chat interface with connection selector, chat list, message thread, and real-time unread counts
- `/connections`: Connection management with QR scanning and webhook configuration
- `/settings`: Application preferences (API configuration)
- `/developer-docs`: Comprehensive API documentation for developers

### UI Component System

**Design System**: shadcn/ui components built on Radix UI primitives with Tailwind CSS styling.

**Theming**: Light/dark mode support with CSS custom properties, theme toggle persisted to localStorage.

**Component Organization**:
- Reusable UI primitives in `components/ui/` (buttons, cards, dialogs, inputs)
- Feature-specific components in `components/` (ChatList, MessageBubble, ConnectionCard, QRCodeModal)
- Each component fully typed with TypeScript interfaces

**Styling Approach**: Tailwind utility classes with custom design tokens defined in `tailwind.config.ts` and `index.css`. Border radius and color system customized to match design guidelines.

### API Structure

**REST Endpoints**:
- `GET /api/connections` - List all WhatsApp connections
- `POST /api/connections` - Create new connection
- `GET /api/get-qr/:connection_id` - Request QR code (long-polling endpoint)
- `POST /api/send-message` - Send outbound message
- `PATCH /api/connections/:connection_id/webhook` - Update webhook URL
- `DELETE /api/connections/:connection_id` - Disconnect and remove connection
- `GET /api/chats/:connection_id` - List chats for a connection (now includes accurate unread counts)
- `GET /api/messages/:connection_id/:chat_id` - Get message history
- `PATCH /api/messages/:connection_id/:chat_id/mark-read` - Mark all messages in a chat as read

**Request/Response**: JSON format exclusively. Validation with Zod schemas for type safety.

**Error Handling**: Standard HTTP status codes with JSON error responses. Client-side error toasts for user feedback.

## External Dependencies

### WhatsApp Integration
- **@whiskeysockets/baileys** (v6.7.21): Core WhatsApp Web Multi-Device API library. Handles WebSocket connection to WhatsApp servers, encryption, message encoding/decoding, and multi-file authentication state management.

### Database
- **PostgreSQL**: Primary data store via Neon serverless driver (`@neondatabase/serverless`)
- **Drizzle ORM**: Type-safe database operations with schema migrations
- Database connection pooling via `@neondatabase/serverless` Pool

### Real-Time Communication
- **Socket.IO** (server & client): WebSocket library for bidirectional event-based communication
- Transports: WebSocket with polling fallback

### Frontend Stack
- **React 18**: UI framework with functional components
- **TypeScript**: Type safety across codebase
- **Vite**: Build tool and dev server
- **TanStack Query (React Query)**: Server state management and caching
- **Wouter**: Lightweight client-side routing

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui**: Pre-built component collection using Radix + Tailwind
- **class-variance-authority**: Variant-based component styling
- **qrcode.react**: QR code SVG generation for display

### Backend Infrastructure
- **Express.js**: HTTP server framework
- **ws**: WebSocket library (used by Baileys for WhatsApp connection)
- **axios**: HTTP client for webhook delivery

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundler for production builds
- **drizzle-kit**: Database migration tool

### Validation & Utilities
- **Zod**: Runtime type validation for API requests
- **nanoid**: Unique ID generation
- **date-fns**: Date formatting and manipulation
- **@hapi/boom**: HTTP error objects

### Session Storage
- File system-based session storage for WhatsApp credentials (no external session store)
- Sessions persist in `./whatsapp-sessions/{connection_id}/` directory structure