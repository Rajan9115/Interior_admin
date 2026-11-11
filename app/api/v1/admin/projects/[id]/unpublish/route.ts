import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
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

/**
 * POST /api/v1/admin/projects/[id]/unpublish
 * Returns a published project back to DRAFT state.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("Cross-origin request rejected.");
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return apiNotFound("Project not found.");
  }

  const unpublishedProject = await prisma.project.update({
    where: { id },
    data: {
      status: ContentStatus.DRAFT,
    },
    include: {
      category: true,
      media: {
        include: { mediaAsset: true },
        orderBy: { sortOrder: "asc" },
      },
      highlights: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Log audit
  await logActivity({
    adminUserId: adminContext.adminUser.id,
    action: ActivityAction.PROJECT_UNPUBLISHED,
    entityType: "Project",
    entityId: unpublishedProject.id,
    summary: `Unpublished project "${unpublishedProject.title}" (returned to draft)`,
  });

  return apiSuccess(serializeBigInt(unpublishedProject));
}

