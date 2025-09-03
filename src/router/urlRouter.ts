import { Router , Request , Response } from "express"
import { shortenUrl, getOriginalUrl } from "../services/urlService.ts"

const urlRouter = Router()

urlRouter.post("/url", async (req: Request, res: Response) => {
  const { url, clientId } = req.body
  if (!url || !clientId) {
    return res.status(400).json({ error: "Missing data" })
  }
  await shortenUrl(url, clientId)
  return res.status(200).json({ message: "url saved" })
})

urlRouter.get(":code", async (req: Request, res: Response) => {
  const code = req.params.code
  const original = await getOriginalUrl(code)
  if (!original) {
    return res.status(404).json({ error: "Not found" })
  }
  return res.json({ url: original })
})

export default urlRouter