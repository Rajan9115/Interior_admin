import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { validateForPublishing } from "@/lib/validation/project";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
import { logActivity } from "@/server/audit/audit.service";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/http/response";
import { ActivityAction, ContentStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/admin/projects/[id]/publish
 * Validates required fields, service category, and cover image before publishing.
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
    include: {
      category: true,
      media: {
        include: { mediaAsset: true },
        orderBy: { sortOrder: "asc" },
      },
      highlights: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) {
    return apiNotFound("Project not found.");
  }

  // Authoritatively validate all publishing criteria server-side
  const publishValidation = validateForPublishing({
    title: project.title,
    slug: project.slug,
    categoryId: project.categoryId,
    shortDescription: project.shortDescription,
    media: project.media.map((m) => ({
      role: m.role,
      mediaAssetId: m.mediaAssetId,
    })),
  });

  if (!publishValidation.isValid) {
    return apiError(
      "PUBLISH_CRITERIA_UNMET",
      publishValidation.errors.join(" "),
      422
    );
  }

  // Update status and publishedAt
  const publishedProject = await prisma.project.update({
    where: { id },
    data: {
      status: ContentStatus.PUBLISHED,
      publishedAt: project.publishedAt || new Date(),
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
    action: ActivityAction.PROJECT_PUBLISHED,
    entityType: "Project",
    entityId: publishedProject.id,
    summary: `Published project "${publishedProject.title}" to live site`,
  });

  return apiSuccess(serializeBigInt(publishedProject));
}

