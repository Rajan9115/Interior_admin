import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { projectSchema } from "@/lib/validation/project";
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
 * GET /api/v1/admin/projects/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      category: true,
      highlights: { orderBy: { sortOrder: "asc" } },
      media: {
        include: { mediaAsset: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) {
    return apiNotFound("Project not found.");
  }

  return apiSuccess(serializeBigInt(project));
}

/**
 * PATCH /api/v1/admin/projects/[id]
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

  const existingProject = await prisma.project.findUnique({
    where: { id },
  });

  if (!existingProject) {
    return apiNotFound("Project not found.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Malformed JSON body.", 400);
  }

  const validation = projectSchema.safeParse(body);
  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return apiError("VALIDATION_ERROR", "Please review submitted fields.", 422, fieldErrors);
  }

  const data = validation.data;

  // 1. If slug changed, ensure new slug is unique
  if (data.slug !== existingProject.slug) {
    const slugConflict = await prisma.project.findUnique({
      where: { slug: data.slug },
    });
    if (slugConflict && slugConflict.id !== id) {
      return apiError("SLUG_CONFLICT", "A project with this URL slug already exists.", 409, {
        slug: ["This slug is already in use."],
      });
    }
  }

  const requestedStatus = (body as { status?: ContentStatus }).status;
  const status =
    requestedStatus && Object.values(ContentStatus).includes(requestedStatus)
      ? requestedStatus
      : existingProject.status;

  // 2. Transactionally update project and highlights
  const updatedProject = await prisma.$transaction(async (tx) => {
    // Delete existing highlights and recreate
    await tx.projectHighlight.deleteMany({ where: { projectId: id } });

    const project = await tx.project.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        categoryId: data.categoryId,
        locationLabel: data.locationLabel,
        shortDescription: data.shortDescription,
        description: data.description,
        completionDate: data.completionDate ? new Date(data.completionDate) : null,
        isFeatured: data.isFeatured,
        status,
        publishedAt:
          status === ContentStatus.PUBLISHED && !existingProject.publishedAt
            ? new Date()
            : existingProject.publishedAt,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        highlights: {
          create: data.highlights.map((text, idx) => ({
            text,
            sortOrder: idx,
          })),
        },
      },
      include: {
        category: true,
        highlights: { orderBy: { sortOrder: "asc" } },
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return project;
  });

  // 3. Log activity
  await logActivity({
    adminUserId: adminContext.adminUser.id,
    action: ActivityAction.PROJECT_UPDATED,
    entityType: "Project",
    entityId: updatedProject.id,
    summary: `Updated project "${updatedProject.title}" (status: ${updatedProject.status})`,
  });

  return apiSuccess(serializeBigInt(updatedProject));
}

