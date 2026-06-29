import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// The key must be 32 bytes (256 bits). We derive it from the secret using scryptSync.
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "default-fallback-encryption-secret-key-32-chars";
const KEY = crypto.scryptSync(ENCRYPTION_SECRET, "salt", 32);

/**
 * Encrypt plain text using aes-256-gcm.
 * Returns a colon-separated string: iv:authTag:encryptedContent
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt ciphertext encrypted using encrypt().
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
