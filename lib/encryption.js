import crypto from "crypto"

// In a real app, you would use a proper key management system
// This is just for demonstration purposes
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "a-very-secret-key-that-should-be-in-env-vars"
const IV_LENGTH = 16 // For AES, this is always 16

export function encryptMessage(text) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  return `${iv.toString("hex")}:${encrypted}`
}

export function decryptMessage(text) {
  const parts = text.split(":")
  const iv = Buffer.from(parts[0], "hex")
  const encryptedText = parts[1]

  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)

  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
