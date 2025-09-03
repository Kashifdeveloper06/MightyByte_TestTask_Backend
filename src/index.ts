import express from "express"
import urlRouter from "./router/urlRouter.ts"
import { WebSocketServer } from "ws"
import { registerWsClient } from "./storage/storage.ts"
import dotenv from "dotenv"

dotenv.config()

const PORT = process.env.PORT 
const app = express()
app.use(express.json())
app.use("/", urlRouter)

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})

const wss = new WebSocketServer({ server })

wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url?.split("?")[1])
  const clientId = urlParams.get("clientId")

  if (clientId) {
    registerWsClient(clientId, ws)
  } else {
    console.log("WebSocket client connected without clientId")
    ws.close()
  }
})
