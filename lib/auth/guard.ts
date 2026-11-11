import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  validateAdminSession,
  SessionContext,
} from "./session";

/**
 * Extracts the client IP address from proxy headers or socket info.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Validates the origin or referer header against the request host
 * to prevent Cross-Site Request Forgery on cookie-authenticated mutations.
 */
export function verifyMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    // If Origin is omitted (e.g. some same-origin GET/fetch), check Referer
    const referer = request.headers.get("referer");
    if (!referer) return true; // Non-browser or direct call
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) {
      return true;
    }

    // Also allow configured development and admin hosts
    const allowed = [
      "localhost:3000",
      "localhost:3001",
      "127.0.0.1:3000",
      "127.0.0.1:3001",
      "admin.mamainterior.in",
    ];
    return allowed.includes(originUrl.host);
  } catch {
    return false;
  }
}

/**
 * Server Guard: Resolves and validates the current active admin session.
 * Reads the secure HttpOnly cookie and validates with PostgreSQL.
 */
export async function getSessionContext(
  request?: Request
): Promise<SessionContext | null> {
  let token: string | undefined;

  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`)
      );
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // If outside Next.js cookies context
    }
  }

  if (!token) {
    return null;
  }

  return validateAdminSession(token);
}

/**
 * Guard that guarantees the caller is an authenticated, active owner.
 * Returns the session context or null.
 */
export async function requireAdmin(
  request?: Request
): Promise<SessionContext | null> {
  const context = await getSessionContext(request);
  if (!context || !context.adminUser.isActive) {
    return null;
  }
  return context;
}

