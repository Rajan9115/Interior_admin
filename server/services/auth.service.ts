import "server-only";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/crypto";
import { isRateLimited, recordFailure, resetLimit } from "@/lib/auth/rate-limit";
import { createAdminSession, revokeAdminSession, validateAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/server/audit/audit.service";
import { LoginInput } from "@/lib/validation/auth";
import { ActivityAction } from "@prisma/client";

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  rawToken?: string;
  expiresAt?: Date;
  error?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
}

/**
 * Executes a secure owner sign-in attempt.
 * Enforces rate limiting, bcrypt verification, session rotation, and audit logging.
 */
export async function authenticateOwner(
  input: LoginInput,
  clientMeta: { ip: string; userAgent: string | null }
): Promise<LoginResult> {
  const rateLimitKey = `login:${clientMeta.ip}:${input.email}`;

  // 1. Enforce rate limiting
  const rateStatus = isRateLimited(rateLimitKey, 5);
  if (rateStatus.limited) {
    await logActivity({
      action: ActivityAction.LOGIN_FAILURE,
      summary: "Login rejected due to rate limiting",
      metadata: { ipHash: clientMeta.ip.slice(0, 10), email: input.email },
    });

    return {
      success: false,
      rateLimited: true,
      retryAfterSeconds: rateStatus.retryAfterSeconds,
      error: `Too many failed attempts. Please try again in ${rateStatus.retryAfterSeconds} seconds.`,
    };
  }

  // 2. Query user by email
  const user = await prisma.adminUser.findUnique({
    where: { email: input.email },
  });

  // 3. Generic invalid credentials on user not found or inactive
  if (!user || !user.isActive) {
    recordFailure(rateLimitKey);
    await logActivity({
      action: ActivityAction.LOGIN_FAILURE,
      summary: "Failed login attempt (user not found or inactive)",
      metadata: { email: input.email },
    });

    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  // 4. Verify password with bcrypt
  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    recordFailure(rateLimitKey);
    await logActivity({
      adminUserId: user.id,
      action: ActivityAction.LOGIN_FAILURE,
      summary: "Failed login attempt (invalid password)",
      metadata: { email: input.email },
    });

    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  // 5. Successful authentication: reset rate limiter
  resetLimit(rateLimitKey);

  // 6. Update last login timestamp
  const now = new Date();
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: now },
  });

  // 7. Create opaque session
  const { rawToken, expiresAt } = await createAdminSession(user.id, {
    userAgent: clientMeta.userAgent,
    ipAddress: clientMeta.ip,
  });

  // 8. Log successful login
  await logActivity({
    adminUserId: user.id,
    action: ActivityAction.LOGIN_SUCCESS,
    summary: `Owner signed in successfully from ${clientMeta.ip}`,
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    rawToken,
    expiresAt,
  };
}

/**
 * Revokes the owner's session and records audit event.
 */
export async function terminateSession(
  rawToken: string,
  adminUserId?: string
): Promise<void> {
  if (rawToken) {
    await revokeAdminSession(rawToken);
  }

  if (adminUserId) {
    await logActivity({
      adminUserId,
      action: ActivityAction.LOGOUT,
      summary: "Owner signed out",
    });
  }
}

/**
 * Returns the current authenticated session profile without sensitive fields.
 */
export async function getAuthenticatedProfile(rawToken: string) {
  const context = await validateAdminSession(rawToken);
  if (!context) {
    return null;
  }

  return {
    id: context.adminUser.id,
    email: context.adminUser.email,
    displayName: context.adminUser.displayName,
    role: context.adminUser.role,
    lastLoginAt: context.adminUser.lastLoginAt,
    createdAt: context.adminUser.createdAt,
  };
}
