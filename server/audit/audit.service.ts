import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ActivityAction, Prisma } from "@prisma/client";

export interface LogActivityParams {
  adminUserId?: string | null;
  action: ActivityAction;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Persists an administrative activity log entry to PostgreSQL.
 * Safe from leaking secrets; any sensitive fields in metadata must be omitted by caller.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        adminUserId: params.adminUserId ?? null,
        action: params.action,
        summary: params.summary,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Non-blocking fallback: do not crash user requests if audit recording fails
    console.warn("[AuditLog Warning] Failed to persist activity log:", error);
  }
}

