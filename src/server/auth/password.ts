import "server-only";
import { randomBytes, timingSafeEqual, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/**
 * Hashes a password with Node's built-in `scrypt` - no bcrypt/argon2
 * dependency (and no native-binary build step to worry about on Vercel).
 * Stored as `salt:hash`, both hex - self-describing, so there's nothing
 * else to persist alongside it.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

/** Constant-time compare so a failed attempt can't be timed to leak the hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const hash = Buffer.from(hashHex, "hex");
  const candidate = (await scrypt(password, salt, hash.length)) as Buffer;
  return hash.length === candidate.length && timingSafeEqual(hash, candidate);
}
