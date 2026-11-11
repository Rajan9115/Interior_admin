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
import { ActivityAction } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/admin/projects/[id]/featured
 * Toggles or sets the featured state of a project.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const body = await request.json().catch(() => ({}));
  const isFeatured =
    typeof body.isFeatured === "boolean" ? body.isFeatured : !project.isFeatured;

  const updated = await prisma.project.update({
    where: { id },
    data: {
      isFeatured,
    },
    include: {
      category: true,
      media: {
        include: { mediaAsset: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  await logActivity({
    adminUserId: adminContext.adminUser.id,
    action: ActivityAction.PROJECT_UPDATED,
    entityType: "Project",
    entityId: updated.id,
    summary: `${isFeatured ? "Marked" : "Unmarked"} project "${updated.title}" as homepage featured`,
  });

  return apiSuccess(serializeBigInt(updated));
}

