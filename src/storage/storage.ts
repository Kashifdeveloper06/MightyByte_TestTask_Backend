import fs from "fs/promises"
import { WebSocket } from "ws"
import cron from "node-cron"

const filePath = "./data.json"
const pendingFilePath = "./pending.json"

let mapping: Record<string, string> = {}
let wsClients: Map<string, WebSocket> = new Map()
let pendingDeliveries: Map<string, PendingMessage> = new Map()

interface PendingMessage {
  clientId: string
  shortenedUrl: string
  attempts: number
  lastAttempt: number
  maxRetries: number
}


(async () => {
  try {
    const data = await fs.readFile(filePath, "utf-8")
    mapping = JSON.parse(data)
  } catch {
    mapping = {}
  }

  try {
    const pendingData = await fs.readFile(pendingFilePath, "utf-8")
    const pending = JSON.parse(pendingData)
    for (const [messageId, msg] of Object.entries(pending)) {
      pendingDeliveries.set(messageId, msg as PendingMessage)
    }
  } catch { }
})()

export async function saveMapping(code: string, url: string) {
  mapping[code] = url
  await fs.writeFile(filePath, JSON.stringify(mapping, null, 2))
}

export async function findUrl(code: string) {
  return mapping[code]
}

async function savePendingDeliveries() {
  const pendingObj = Object.fromEntries(pendingDeliveries)
  await fs.writeFile(pendingFilePath, JSON.stringify(pendingObj, null, 2))
}

export function registerWsClient(clientId: string, ws: WebSocket) {
  wsClients.set(clientId, ws)
  ws.on("close", () => {
    wsClients.delete(clientId)
  })
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString())
      if (data.ack && data.messageId) {
        console.log(`ACK received for ${data.messageId}`)
        pendingDeliveries.delete(data.messageId)
        savePendingDeliveries()
      }
    } catch {
      console.log(`Invalid message from ${clientId}:`, msg.toString())
    }
  })
  retryPendingForClient(clientId)
}

async function retryPendingForClient(clientId: string) {
  const clientMessages = Array.from(pendingDeliveries.entries()).filter(([_, msg]) => msg.clientId === clientId)
  if (clientMessages.length > 0) {
    for (const [messageId, _] of clientMessages) {
      await deliverMessage(messageId)
    }
  }
}

async function deliverMessage(messageId: string) {
  const pending = pendingDeliveries.get(messageId)
  if (!pending) return
  const ws = wsClients.get(pending.clientId)
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return
  }
  pending.attempts++
  pending.lastAttempt = Date.now()

  const payload = {
    messageId: messageId,
    shortenedURL: pending.shortenedUrl
  }

  try {
    ws.send(JSON.stringify(payload))
    await savePendingDeliveries()
  } catch (error) {
    console.error(`Failed to send message ${messageId}:`, error)
  }
}

export async function sendShortenedUrlToClient(clientId: string, shortenedUrl: string) {
  const messageId = `${clientId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const pendingMessage: PendingMessage = {
    clientId,
    shortenedUrl,
    attempts: 0,
    lastAttempt: 0,
    maxRetries: 5
  }
  pendingDeliveries.set(messageId, pendingMessage)
  await savePendingDeliveries()
  await deliverMessage(messageId)
}

cron.schedule("* * * * *", async () => {
  const now = Date.now()
  const retryDelay = 30 * 1000

  for (const [messageId, pending] of pendingDeliveries.entries()) {
    const timeSinceLastAttempt = now - pending.lastAttempt
    const shouldRetry = timeSinceLastAttempt > retryDelay && pending.attempts < pending.maxRetries
    if (shouldRetry) {
      await deliverMessage(messageId)
    } else if (pending.attempts >= pending.maxRetries) {
      console.log(`Giving up on message ${messageId} after ${pending.attempts} attempts`)
      pendingDeliveries.delete(messageId)
      savePendingDeliveries()
    }
  }
})