import { generateCode } from "../utils/codeGenerator.ts"
import { saveMapping, findUrl, sendShortenedUrlToClient } from "../storage/storage.ts"

export async function shortenUrl(url: string, clientId: string) {
  const code = generateCode(10)
  const shortened = `${process.env.BASE_URL}/${code}`
  await saveMapping(code, url)
  sendShortenedUrlToClient(clientId, shortened)
  return shortened
}

export async function getOriginalUrl(code: string) {
  return findUrl(code)
}
 