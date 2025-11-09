import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Book, Webhook, Key, Send, MessageSquare, Users, BarChart3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DeveloperDocs() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Developer Documentation
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Complete API reference and integration guide for WhatsApp Manager
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-6xl mx-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6" data-testid="tabs-docs-sections">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="authentication" data-testid="tab-authentication">Authentication</TabsTrigger>
              <TabsTrigger value="api" data-testid="tab-api">API Endpoints</TabsTrigger>
              <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="websockets" data-testid="tab-websockets">WebSockets</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card data-testid="card-getting-started">
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>Quick start guide to integrate with WhatsApp Manager API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Base URL</h3>
                    <code className="block bg-muted p-3 rounded-md" data-testid="text-base-url">
                      {window.location.origin}/api
                    </code>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Quick Start</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Create a WhatsApp connection and scan the QR code</li>
                      <li>Generate an API token for your connection</li>
                      <li>Use the API token to authenticate your requests</li>
                      <li>Start sending and receiving messages</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-features">
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Send className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Send Messages</h4>
                        <p className="text-sm text-muted-foreground">Text, images, links, buttons, and polls</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Receive Messages</h4>
                        <p className="text-sm text-muted-foreground">Real-time webhook notifications</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Multi-Connection</h4>
                        <p className="text-sm text-muted-foreground">Manage multiple WhatsApp accounts</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium">Analytics</h4>
                        <p className="text-sm text-muted-foreground">Track messages and webhook calls</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="authentication" className="space-y-6">
              <Card data-testid="card-auth-guide">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    <CardTitle>API Token Authentication</CardTitle>
                  </div>
                  <CardDescription>Secure your API requests with authentication tokens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Generating an API Token</h3>
                    <div className="space-y-3">
                      <p className="text-sm">
                        1. Go to the <strong>Connections</strong> page in the dashboard
                      </p>
                      <p className="text-sm">
                        2. Click on a connection to view its details
                      </p>
                      <p className="text-sm">
                        3. In the API Token section, click <strong>Generate New Token</strong>
                      </p>
                      <p className="text-sm">
                        4. Copy the generated token (it will only be shown once)
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Using the API Token</h3>
                    <p className="text-sm mb-3">Include the API token in the <code className="bg-muted px-1 rounded">X-API-Token</code> header:</p>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto" data-testid="code-auth-example">
{`curl -X POST \\
  ${window.location.origin}/api/send-text \\
  -H 'X-API-Token: your_api_token_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "connection_id": "your_connection_id",
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello World"
  }'`}
                    </pre>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-500 mb-2">Security Best Practices</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Never expose your API token in client-side code</li>
                      <li>Store tokens securely in environment variables</li>
                      <li>Rotate tokens periodically</li>
                      <li>Use HTTPS for all API requests</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <EndpointCard
                method="GET"
                endpoint="/api/get-qr/:connection_id"
                title="Get QR Code"
                description="Retrieve QR code for WhatsApp connection"
                parameters={[
                  { name: "connection_id", type: "string", description: "Unique connection identifier" }
                ]}
                response={`{
  "qr": "data:image/png;base64,...",
  "connection_id": "my-connection",
  "status": "connecting"
}`}
                requiresAuth={false}
              />

              <EndpointCard
                method="POST"
                endpoint="/api/send-text"
                title="Send Text Message"
                description="Send a text message to a WhatsApp number"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" },
                  { name: "to", type: "string", description: "Recipient number (format: 1234567890@s.whatsapp.net)" },
                  { name: "message", type: "string", description: "Message content" },
                  { name: "message_id", type: "string", description: "Optional client message ID", required: false }
                ]}
                request={`{
  "connection_id": "my-connection",
  "to": "1234567890@s.whatsapp.net",
  "message": "Hello from API!"
}`}
                response={`{
  "success": true,
  "message_id": "msg_123456",
  "status": "sent"
}`}
                requiresAuth={true}
              />

              <EndpointCard
                method="POST"
                endpoint="/api/send-image"
                title="Send Image"
                description="Send an image message with optional caption"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" },
                  { name: "to", type: "string", description: "Recipient number" },
                  { name: "image_url", type: "string", description: "Public URL of the image" },
                  { name: "caption", type: "string", description: "Optional image caption", required: false }
                ]}
                request={`{
  "connection_id": "my-connection",
  "to": "1234567890@s.whatsapp.net",
  "image_url": "https://example.com/image.jpg",
  "caption": "Check this out!"
}`}
                response={`{
  "success": true,
  "message_id": "msg_123456"
}`}
                requiresAuth={true}
              />

              <EndpointCard
                method="POST"
                endpoint="/api/send-poll"
                title="Send Poll"
                description="Send an interactive poll message"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" },
                  { name: "to", type: "string", description: "Recipient number" },
                  { name: "question", type: "string", description: "Poll question" },
                  { name: "options", type: "array", description: "Array of poll options (strings)" }
                ]}
                request={`{
  "connection_id": "my-connection",
  "to": "1234567890@s.whatsapp.net",
  "question": "What's your favorite color?",
  "options": ["Red", "Blue", "Green", "Yellow"]
}`}
                response={`{
  "success": true,
  "message_id": "msg_123456"
}`}
                requiresAuth={true}
              />

              <EndpointCard
                method="POST"
                endpoint="/api/send-buttons"
                title="Send Button Message"
                description="Send a message with interactive buttons"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" },
                  { name: "to", type: "string", description: "Recipient number" },
                  { name: "text", type: "string", description: "Button message text" },
                  { name: "footer", type: "string", description: "Optional footer text", required: false },
                  { name: "buttons", type: "array", description: "Array of button objects (max 3)" }
                ]}
                request={`{
  "connection_id": "my-connection",
  "to": "1234567890@s.whatsapp.net",
  "text": "Choose an option:",
  "footer": "Powered by WhatsApp Manager",
  "buttons": [
    { "id": "1", "title": "Option 1" },
    { "id": "2", "title": "Option 2" }
  ]
}`}
                response={`{
  "success": true,
  "message_id": "msg_123456"
}`}
                requiresAuth={true}
              />

              <EndpointCard
                method="GET"
                endpoint="/api/connections"
                title="List Connections"
                description="Get all WhatsApp connections"
                parameters={[]}
                response={`[
  {
    "id": "uuid",
    "connectionId": "my-connection",
    "phoneNumber": "+1234567890",
    "status": "connected",
    "webhookUrl": "https://example.com/webhook",
    "lastActive": "2024-01-01T00:00:00.000Z"
  }
]`}
                requiresAuth={false}
              />

              <EndpointCard
                method="GET"
                endpoint="/api/chats/:connection_id"
                title="Get Chats"
                description="Retrieve all chats for a connection"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" }
                ]}
                response={`[
  {
    "chatId": "1234567890@s.whatsapp.net",
    "name": "1234567890",
    "phoneNumber": "1234567890",
    "lastMessage": "Hello!",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "unreadCount": 3
  }
]`}
                requiresAuth={false}
              />

              <EndpointCard
                method="GET"
                endpoint="/api/messages/:connection_id/:chat_id"
                title="Get Messages"
                description="Retrieve messages for a specific chat"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" },
                  { name: "chat_id", type: "string", description: "Chat ID" },
                  { name: "limit", type: "number", description: "Max messages to return (default: 50)", required: false }
                ]}
                response={`[
  {
    "id": "msg_id",
    "content": "Hello!",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "isSent": false,
    "status": "delivered",
    "mediaType": null,
    "pollQuestion": null
  }
]`}
                requiresAuth={false}
              />

              <EndpointCard
                method="PATCH"
                endpoint="/api/messages/:connection_id/:chat_id/mark-read"
                title="Mark Messages as Read"
                description="Mark all messages in a chat as read"
                parameters={[
                  { name: "connection_id", type: "string", description: "Your connection ID" },
                  { name: "chat_id", type: "string", description: "Chat ID" }
                ]}
                response={`{
  "success": true,
  "message": "Messages marked as read"
}`}
                requiresAuth={false}
              />
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-6">
              <Card data-testid="card-webhook-guide">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    <CardTitle>Webhook Integration</CardTitle>
                  </div>
                  <CardDescription>Receive real-time notifications for incoming messages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Setting Up Webhooks</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Create an HTTPS endpoint on your server</li>
                      <li>Go to the Connections page and select your connection</li>
                      <li>Enter your webhook URL in the settings</li>
                      <li>Save and start receiving webhook events</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Webhook Payload - Incoming Message</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm" data-testid="code-webhook-message">
{`{
  "event": "message.received",
  "connection_id": "my-connection",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "message_id": "msg_123456",
    "from": "1234567890@s.whatsapp.net",
    "to": "your_number@s.whatsapp.net",
    "chat_id": "1234567890@s.whatsapp.net",
    "message_body": "Hello!",
    "message_type": "text",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Webhook Payload - Poll Response</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm" data-testid="code-webhook-poll">
{`{
  "event": "poll.response",
  "connection_id": "my-connection",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "message_id": "msg_123456",
    "from": "1234567890@s.whatsapp.net",
    "poll_message_id": "poll_msg_id",
    "selected_option": "Blue",
    "chat_id": "1234567890@s.whatsapp.net"
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Webhook Payload - Button Response</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm" data-testid="code-webhook-button">
{`{
  "event": "button.clicked",
  "connection_id": "my-connection",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "message_id": "msg_123456",
    "from": "1234567890@s.whatsapp.net",
    "button_id": "1",
    "button_text": "Option 1",
    "chat_id": "1234567890@s.whatsapp.net"
  }
}`}
                    </pre>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-500 mb-2">Webhook Retry Logic</h4>
                    <p className="text-sm">
                      Failed webhook deliveries are retried up to 3 times with exponential backoff.
                      You can view webhook delivery logs in the connection details page.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="websockets" className="space-y-6">
              <Card data-testid="card-websocket-guide">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    <CardTitle>WebSocket Events</CardTitle>
                  </div>
                  <CardDescription>Real-time updates via Socket.IO</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Connecting to WebSocket</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto" data-testid="code-websocket-connect">
{`import io from 'socket.io-client';

const socket = io('${window.location.origin}');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">QR Code Update Event</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`socket.on('qr-update', (data) => {
  console.log('QR Code:', data.qr);
  console.log('Connection ID:', data.connectionId);
  // Display QR code to user
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Connection Status Event</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`socket.on('connection-status', (data) => {
  console.log('Status:', data.status);
  console.log('Phone:', data.phoneNumber);
  console.log('Connection ID:', data.connectionId);
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">New Message Event</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`socket.on('new-message', (data) => {
  console.log('New message from:', data.chatId);
  console.log('Connection:', data.connectionId);
  // Refresh messages for this chat
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Message Sent Event</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`socket.on('message-sent', (data) => {
  console.log('Message sent to:', data.chatId);
  console.log('Client ID:', data.clientMessageId);
  // Update message status in UI
});`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

interface EndpointCardProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  endpoint: string;
  title: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }>;
  request?: string;
  response?: string;
  requiresAuth: boolean;
}

function EndpointCard({
  method,
  endpoint,
  title,
  description,
  parameters,
  request,
  response,
  requiresAuth,
}: EndpointCardProps) {
  const methodColors = {
    GET: "bg-blue-500",
    POST: "bg-green-500",
    PATCH: "bg-yellow-500",
    DELETE: "bg-red-500",
  };

  return (
    <Card data-testid={`card-endpoint-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${methodColors[method]} text-white`}>{method}</Badge>
          <code className="text-sm font-mono">{endpoint}</code>
          {requiresAuth && (
            <Badge variant="outline" className="gap-1">
              <Key className="h-3 w-3" />
              Auth Required
            </Badge>
          )}
        </div>
        <CardTitle className="mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parameters.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Parameters</h4>
            <div className="space-y-2">
              {parameters.map((param, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono">
                    {param.name}
                  </code>
                  <span className="text-muted-foreground">({param.type})</span>
                  {!param.required && (
                    <span className="text-muted-foreground italic">optional</span>
                  )}
                  <span className="text-muted-foreground">- {param.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {request && (
          <div>
            <h4 className="font-semibold mb-2">Request Example</h4>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
              {request}
            </pre>
          </div>
        )}

        {response && (
          <div>
            <h4 className="font-semibold mb-2">Response Example</h4>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
              {response}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
