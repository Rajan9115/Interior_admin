import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/server/audit/audit.service";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/http/response";
import { ActivityAction, ContentStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("Cross-origin request rejected.");
  }

  const { id } = await params;

  const existingProject = await prisma.project.findUnique({
    where: { id },
  });

  if (!existingProject) {
    return apiNotFound("Project not found.");
  }

  const archived = await prisma.project.update({
    where: { id },
    data: {
      status: ContentStatus.ARCHIVED,
      archivedAt: new Date(),
    },
  });

  await logActivity({
    adminUserId: adminContext.adminUser.id,
    action: ActivityAction.PROJECT_ARCHIVED,
    entityType: "Project",
    entityId: archived.id,
    summary: `Archived project "${archived.title}"`,
  });

  return apiSuccess({
    id: archived.id,
    status: archived.status,
    message: `Project "${archived.title}" has been safely archived.`,
  });
}

