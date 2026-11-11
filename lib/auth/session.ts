import "server-only";
import { prisma } from "@/lib/db/prisma";
import { generateOpaqueToken, hashToken, anonymizeIdentifier } from "./crypto";
import { AdminUser, AdminSession } from "@prisma/client";

export const SESSION_COOKIE_NAME = "mama_admin_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionContext {
  session: AdminSession;
  adminUser: AdminUser;
}

export function getSessionCookieOptions(maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * Creates and persists a new authenticated owner session.
 * Returns the unhashed raw token to be set in an HttpOnly cookie.
 */
export async function createAdminSession(
  adminUserId: string,
  clientMeta?: { userAgent?: string | null; ipAddress?: string | null }
): Promise<{ rawToken: string; expiresAt: Date; session: AdminSession }> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await prisma.adminSession.create({
    data: {
      adminUserId,
      tokenHash,
      expiresAt,
      userAgent: clientMeta?.userAgent ? clientMeta.userAgent.slice(0, 255) : null,
      ipAddressHash: clientMeta?.ipAddress ? anonymizeIdentifier(clientMeta.ipAddress) : null,
    },
  });

  return { rawToken, expiresAt, session };
}

/**
 * Validates an opaque raw session token against the database.
 * Enforces token hash match, expiration check, and account active state.
 */
export async function validateAdminSession(
  rawToken: string
): Promise<SessionContext | null> {
  if (!rawToken || typeof rawToken !== "string") {
    return null;
  }

  const tokenHash = hashToken(rawToken);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { adminUser: true },
  });

  if (!session) {
    return null;
  }

  // Enforce session expiration
  const now = new Date();
  if (session.expiresAt <= now) {
    // Clean up expired session record
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Enforce active account status
  if (!session.adminUser.isActive) {
    return null;
  }

  // Debounced lastSeenAt update (update if last seen > 5 minutes ago)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  if (session.lastSeenAt < fiveMinutesAgo) {
    prisma.adminSession
      .update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      })
      .catch(() => {});
  }

  return {
    session,
    adminUser: session.adminUser,
  };
}

/**
 * Revokes an active session by deleting its record from the database.
 */
export async function revokeAdminSession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;

  const tokenHash = hashToken(rawToken);
  try {
    await prisma.adminSession.delete({
      where: { tokenHash },
    });
    return true;
  } catch {
    return false;
  }
}

