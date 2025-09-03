export interface UrlMapping {
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
}

export interface ShortenRequest {
  url: string;
}

export interface ShortenResponse {
  shortenedURL: string;
}

export interface WebSocketMessage {
  type: 'url_shortened' | 'acknowledgment' | 'retry';
  data: any;
  messageId?: string;
}

export interface ClientConnection {
  ws: any;
  pendingMessages: Map<string, { message: WebSocketMessage; retryCount: number; timeout: NodeJS.Timeout }>;
}