import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Strong password hashing using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Constant-time password verification against stored bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return bcrypt.compare(password, storedHash);
}

/**
 * Generates an opaque, cryptographically random session token (64 hex characters).
 */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a SHA-256 hash of a session token for secure database storage.
 * Raw tokens are never persisted to disk or database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Anonymizes sensitive identifiers (like IP addresses) for privacy-compliant activity logs.
 */
export function anonymizeIdentifier(identifier: string): string {
  return crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 16);
}

