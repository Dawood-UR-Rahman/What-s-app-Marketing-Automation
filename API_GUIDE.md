# WhatsApp Manager API Guide

Complete developer guide for integrating with the WhatsApp Manager API.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Webhook Integration](#webhook-integration)
4. [Message Types](#message-types)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)

---

## Authentication

The WhatsApp Manager API uses API tokens for authentication on message-sending endpoints.

### Generating API Tokens

1. Navigate to **Settings** in the UI
2. Select your connection
3. Click **Generate Token**
4. Copy and save the token securely (shown only once)

### Using API Tokens

Include the API token in the `Authorization` header:

```http
Authorization: Bearer YOUR_API_TOKEN
```

**Protected Endpoints:**
- `/api/send-text`
- `/api/send-image`
- `/api/send-link`
- `/api/send-buttons`

---

## API Endpoints

### Base URL
```
http://localhost:5000
```

### 1. Connection Management

#### Create Connection

```http
POST /api/connections
Content-Type: application/json

{
  "connection_id": "my-business-account",
  "webhook_url": "https://your-server.com/webhook" // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "connectionId": "my-business-account",
  "status": "disconnected",
  "qrCode": null,
  "webhookUrl": "https://your-server.com/webhook",
  "apiToken": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get All Connections

```http
GET /api/connections
```

#### Get QR Code

```http
GET /api/get-qr/{connection_id}
```

**Response:**
```json
{
  "qr": "base64_encoded_qr_code",
  "status": "waiting_scan",
  "connection_id": "my-business-account"
}
```

#### Update Webhook URL

```http
PATCH /api/connections/{connection_id}/webhook
Content-Type: application/json

{
  "webhook_url": "https://your-server.com/webhook"
}
```

#### Generate API Token

```http
PATCH /api/connections/{connection_id}/api-token
Content-Type: application/json

{
  "generate_new": true
}
```

**Response:**
```json
{
  "connection_id": "my-business-account",
  "api_token": "wa_1234567890abcdef",
  "warning": "Save this token securely. It cannot be retrieved again.",
  "message": "API token generated successfully"
}
```

#### Delete Connection

```http
DELETE /api/connections/{connection_id}
```

---

### 2. Sending Messages

All message-sending endpoints require API token authentication.

#### Send Text Message

```http
POST /api/send-text
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "connection_id": "my-business-account",
  "to": "923001234567",
  "message": "Hello! This is a test message.",
  "message_id": "client-msg-123" // optional, for tracking
}
```

**Response:**
```json
{
  "status": "sent",
  "message_id": "client-msg-123",
  "provider_message_id": "3EB0ABCD1234567890"
}
```

#### Send Image Message

```http
POST /api/send-image
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "connection_id": "my-business-account",
  "to": "923001234567",
  "image_url": "https://example.com/image.jpg",
  "caption": "Check out this image!",
  "message_id": "client-msg-124"
}
```

#### Send Link Message

```http
POST /api/send-link
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "connection_id": "my-business-account",
  "to": "923001234567",
  "message": "Visit our website for more information:",
  "link": "https://example.com",
  "message_id": "client-msg-125"
}
```

#### Send Interactive Buttons

```http
POST /api/send-buttons
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "connection_id": "my-business-account",
  "to": "923001234567",
  "text": "Please select an option:",
  "footer": "Powered by WhatsApp Manager",
  "buttons": [
    {
      "id": "btn-1",
      "title": "Option 1"
    },
    {
      "id": "btn-2",
      "title": "Option 2"
    },
    {
      "id": "btn-3",
      "title": "Option 3"
    }
  ],
  "message_id": "client-msg-126"
}
```

**Constraints:**
- Minimum 1 button, maximum 3 buttons
- Button title max length: 20 characters
- Footer is optional

---

### 3. Retrieving Messages

#### Get Chats

```http
GET /api/chats/{connection_id}
```

**Response:**
```json
[
  {
    "chatId": "923001234567@s.whatsapp.net",
    "name": "923001234567",
    "phoneNumber": "923001234567",
    "lastMessage": "Hello!",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "unreadCount": 2
  }
]
```

#### Get Messages

```http
GET /api/messages/{connection_id}/{chat_id}?limit=50
```

**Response:**
```json
[
  {
    "id": "uuid",
    "content": "Hello!",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "isSent": false,
    "status": "delivered",
    "clientMessageId": null,
    "providerMessageId": "3EB0ABCD1234567890",
    "mediaType": null,
    "mediaUrl": null
  }
]
```

#### Get Webhook Logs

```http
GET /api/webhook-logs/{connection_id}?limit=100
```

---

## Webhook Integration

Configure a webhook URL to receive real-time notifications when messages arrive.

### Webhook Payload Structure

Your webhook endpoint will receive POST requests with the following structure:

#### New Message Event

```json
{
  "event": "message.received",
  "connection_id": "my-business-account",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": {
    "id": "3EB0ABCD1234567890",
    "from": "923001234567@s.whatsapp.net",
    "to": "923009876543@s.whatsapp.net",
    "chat_id": "923001234567@s.whatsapp.net",
    "body": "Hello! This is a message.",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "is_from_me": false,
    "message_type": "text"
  }
}
```

#### Image Message Event

```json
{
  "event": "message.received",
  "connection_id": "my-business-account",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": {
    "id": "3EB0ABCD1234567890",
    "from": "923001234567@s.whatsapp.net",
    "to": "923009876543@s.whatsapp.net",
    "chat_id": "923001234567@s.whatsapp.net",
    "body": "Image caption",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "is_from_me": false,
    "message_type": "image",
    "media": {
      "mimetype": "image/jpeg",
      "url": "https://example.com/downloaded-image.jpg"
    }
  }
}
```

#### Button Response Event

```json
{
  "event": "message.received",
  "connection_id": "my-business-account",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": {
    "id": "3EB0ABCD1234567890",
    "from": "923001234567@s.whatsapp.net",
    "to": "923009876543@s.whatsapp.net",
    "chat_id": "923001234567@s.whatsapp.net",
    "body": "Option 1",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "is_from_me": false,
    "message_type": "button_response",
    "button": {
      "button_id": "btn-1",
      "button_text": "Option 1"
    }
  }
}
```

### Webhook Headers

Your webhook will receive these headers:

```http
Content-Type: application/json
X-Webhook-Attempt: 1
X-Connection-ID: my-business-account
```

### Retry Logic

- Failed webhooks are retried up to **3 times**
- Exponential backoff: 1s, 2s, 4s
- Timeout: 10 seconds per request

### Implementing a Webhook Endpoint

#### Node.js/Express Example

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const { event, connection_id, message } = req.body;
  
  console.log(`[${connection_id}] Received ${event}`);
  console.log('Message:', message);
  
  // Process the message
  if (event === 'message.received') {
    if (message.message_type === 'text') {
      console.log('Text message:', message.body);
    } else if (message.message_type === 'button_response') {
      console.log('Button clicked:', message.button.button_id);
    }
  }
  
  // Respond with 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

#### Python/Flask Example

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    event = data.get('event')
    connection_id = data.get('connection_id')
    message = data.get('message')
    
    print(f"[{connection_id}] Received {event}")
    print(f"Message: {message}")
    
    # Process the message
    if event == 'message.received':
        if message['message_type'] == 'text':
            print(f"Text message: {message['body']}")
        elif message['message_type'] == 'button_response':
            print(f"Button clicked: {message['button']['button_id']}")
    
    # Respond with 200 to acknowledge receipt
    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Message Types

### Text Messages
Simple text-only messages.

### Image Messages
Messages with image attachments. Requires publicly accessible image URL.

### Link Messages
Text messages with embedded links.

### Interactive Buttons
Messages with up to 3 clickable buttons. Users can respond by clicking a button.

### Button Responses
When a user clicks a button, you'll receive a button response with:
- `button_id`: The ID you assigned to the button
- `button_text`: The button title
- `quoted_message_id`: Reference to the original button message

---

## Error Handling

### Common Error Codes

#### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["to"]
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "error": "Invalid or missing API token"
}
```

#### 404 Not Found
```json
{
  "error": "Connection not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to send message",
  "message": "WhatsApp connection is not active"
}
```

---

## Code Examples

### Complete Integration Example (Node.js)

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';
const API_TOKEN = 'wa_1234567890abcdef';
const CONNECTION_ID = 'my-business-account';

// Helper function for API requests
async function sendMessage(endpoint, payload) {
  try {
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Send text message
async function sendTextMessage(to, message) {
  return await sendMessage('/api/send-text', {
    connection_id: CONNECTION_ID,
    to,
    message,
    message_id: `msg-${Date.now()}`
  });
}

// Send image message
async function sendImageMessage(to, imageUrl, caption) {
  return await sendMessage('/api/send-image', {
    connection_id: CONNECTION_ID,
    to,
    image_url: imageUrl,
    caption,
    message_id: `img-${Date.now()}`
  });
}

// Send buttons message
async function sendButtonsMessage(to, text, buttons) {
  return await sendMessage('/api/send-buttons', {
    connection_id: CONNECTION_ID,
    to,
    text,
    buttons,
    footer: 'Reply with your choice',
    message_id: `btn-${Date.now()}`
  });
}

// Example usage
(async () => {
  // Send a text message
  await sendTextMessage('923001234567', 'Hello from API!');
  
  // Send an image
  await sendImageMessage(
    '923001234567',
    'https://example.com/image.jpg',
    'Check this out!'
  );
  
  // Send interactive buttons
  await sendButtonsMessage('923001234567', 'Choose an option:', [
    { id: 'yes', title: 'Yes' },
    { id: 'no', title: 'No' },
    { id: 'maybe', title: 'Maybe' }
  ]);
})();
```

### Webhook Response Handler (Node.js)

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Auto-reply to button responses
app.post('/webhook', async (req, res) => {
  const { event, connection_id, message } = req.body;
  
  if (event === 'message.received' && !message.is_from_me) {
    const sender = message.from;
    
    // Handle button responses
    if (message.message_type === 'button_response') {
      const buttonId = message.button.button_id;
      let reply = '';
      
      switch (buttonId) {
        case 'yes':
          reply = 'Great! Proceeding with your request.';
          break;
        case 'no':
          reply = 'Okay, cancelled.';
          break;
        case 'maybe':
          reply = 'Let me know when you decide!';
          break;
      }
      
      // Send reply
      await axios.post('http://localhost:5000/api/send-text', {
        connection_id,
        to: sender,
        message: reply
      }, {
        headers: {
          'Authorization': 'Bearer YOUR_API_TOKEN',
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Handle text messages
    if (message.message_type === 'text') {
      const text = message.body.toLowerCase();
      
      if (text.includes('help')) {
        await axios.post('http://localhost:5000/api/send-buttons', {
          connection_id,
          to: sender,
          text: 'How can I help you?',
          buttons: [
            { id: 'support', title: 'Support' },
            { id: 'sales', title: 'Sales' },
            { id: 'info', title: 'Information' }
          ]
        }, {
          headers: {
            'Authorization': 'Bearer YOUR_API_TOKEN',
            'Content-Type': 'application/json'
          }
        });
      }
    }
  }
  
  res.status(200).json({ received: true });
});

app.listen(3000);
```

---

## WebSocket Events (Real-time Updates)

The application also provides WebSocket support for real-time updates.

### Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});
```

### Events

#### QR Code Update
```javascript
socket.on('qr-update', (data) => {
  console.log('QR Code:', data.qr);
  console.log('Connection ID:', data.connectionId);
});
```

#### Connection Status
```javascript
socket.on('connection-status', (data) => {
  console.log('Status:', data.status);
  console.log('Phone:', data.phoneNumber);
  console.log('Connection ID:', data.connectionId);
});
```

#### New Message
```javascript
socket.on('new-message', (data) => {
  console.log('New message from:', data.chatId);
  console.log('Connection:', data.connectionId);
});
```

#### Message Sent
```javascript
socket.on('message-sent', (data) => {
  console.log('Message sent to:', data.chatId);
  console.log('Client ID:', data.clientMessageId);
});
```

---

## Best Practices

1. **Store API Tokens Securely**: Never commit tokens to version control
2. **Validate Webhook Signatures**: In production, implement signature verification
3. **Handle Retries**: Ensure your webhook endpoint is idempotent
4. **Rate Limiting**: Implement rate limiting to avoid overloading WhatsApp
5. **Error Handling**: Always handle API errors gracefully
6. **Message IDs**: Use unique client message IDs for tracking
7. **Connection Status**: Check connection status before sending messages
8. **Media URLs**: Ensure media URLs are publicly accessible and HTTPS

---

## Support

For issues and questions:
- Check webhook logs in the UI: **Settings > Webhook Configuration**
- Review connection status in **Connections** page
- Monitor real-time events via WebSocket
- Check server logs for detailed error messages

