# URL Shortener with WebSocket Delivery

A Node.js URL shortener service that uses WebSocket connections to deliver shortened URLs asynchronously, with built-in retry mechanisms for reliable message delivery.

## Features

* **URL Shortening** : Generate 10-character random codes for URLs
* **WebSocket Delivery** : Shortened URLs are sent via WebSocket (not HTTP response)
* **Reliable Delivery** : Automatic retry mechanism with acknowledgment system
* **Persistent Storage** : File-based storage that survives server restarts
* **Connection Recovery** : Automatically retry pending messages when clients reconnect

## How It Works

1. Client connects to WebSocket with a unique client id
2. Client makes POST request to shorten a URL with same client id
3. Server generates short code and stores mapping
4. Server sends shortened URL via WebSocket (not HTTP response)
5. Client acknowledges receipt
6. If no acknowledgment, server retries automatically

## API Endpoints

### POST /url

Shorten a URL (result delivered via WebSocket)

**Request Body:**

```json
{
  "url": "classcalc.com",
  "clientId": "user123"
}
```

**Response:**

```json
{
  "message": "URL shortening in progress"
}
```

### GET /:code

Retrieve original URL from short code

**Response:**

```json
{
  "url": "classcalc.com"
}
```

## WebSocket Connection

### Connect

```
ws://localhost:3000?clientId=user123
```

### Messages Received

```json
{
  "messageId": "user123-1234567890-abc",
  "shortenedURL": "http://localhost:3000/a2b345w68s"
}
```

### Send Acknowledgment

```json
{
  "ack": true,
  "messageId": "user123-1234567890-abc"
}
```

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file:

```
PORT=3000
```

## Running the Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## Project Structure

```
├── src/
│   ├── index.ts              # Main server setup
│   ├── router/
│   │   └── urlRouter.ts      # HTTP route handlers
│   ├── services/
│   │   └── urlService.ts     # Business logic
│   ├── storage/
│   │   └── storage.ts        # File storage & WebSocket management
│   └── utils/
│       └── codeGenerator.ts  # Random code generation
├── data.json                 # URL mappings (auto-generated)
├── pending.json              # Pending deliveries (auto-generated)
└── .env                      # Environment variables
```

## Example Usage

### JavaScript Client

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000?clientId=user123');

// Listen for shortened URLs
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Shortened URL:', data.shortenedURL);
  
  // Send acknowledgment
  ws.send(JSON.stringify({
    ack: true,
    messageId: data.messageId
  }));
};

// Shorten a URL
fetch('http://localhost:3000/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'classcalc.com',
    clientId: 'user123'
  })
});
```

## Retry Mechanism

* **Immediate delivery** when URL is shortened
* **Reconnection retry** when client reconnects
* **Background retry** every 60 seconds for stale messages
* **Max retries** : 5 attempts per message
* **Retry delay** : 30 seconds between attempts
* **Persistent** : Pending messages survive server restarts

## Error Handling

* Invalid URLs are rejected with 400 status
* Missing clientId closes WebSocket connection
* Failed deliveries are logged and retried
* File system errors are logged but don't crash the server

## Dependencies

* `express` - HTTP server
* `ws` - WebSocket server
* `dotenv` - Environment configuration
* `typescript` - Type safety

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
