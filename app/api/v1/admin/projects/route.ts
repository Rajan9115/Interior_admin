import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { projectSchema, validateForPublishing } from "@/lib/validation/project";
import { findAdminProjects } from "@/server/repositories/project.repository";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
import { logActivity } from "@/server/audit/audit.service";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/http/response";
import { ActivityAction, ContentStatus } from "@prisma/client";

/**
 * GET /api/v1/admin/projects
 * Lists projects with search, category/status filters, and pagination.
 */
export async function GET(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const categorySlug = searchParams.get("category") || undefined;
  const statusParam = searchParams.get("status") as ContentStatus | null;
  const status =
    statusParam && Object.values(ContentStatus).includes(statusParam)
      ? statusParam
      : undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "15", 10);

  const result = await findAdminProjects({
    query,
    categorySlug,
    status,
    page,
    pageSize,
  });

  return apiSuccess(result.items, result.meta);
}

/**
 * POST /api/v1/admin/projects
 * Creates a new project draft or published entry with verified media.
 */
export async function POST(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("Cross-origin request rejected.");
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
    return apiError(
      "VALIDATION_ERROR",
      "Please review submitted fields.",
      422,
      fieldErrors
    );
  }

  const data = validation.data;

  // 1. Check slug uniqueness
  const existingProject = await prisma.project.findUnique({
    where: { slug: data.slug },
  });

  if (existingProject) {
    return apiError(
      "SLUG_CONFLICT",
      "A project with this URL slug already exists.",
      409,
      {
        slug: ["This slug is already in use."],
      }
    );
  }

  // 2. Check category existence
  const category = await prisma.serviceCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    return apiError("INVALID_CATEGORY", "Selected category does not exist.", 400);
  }

  // 3. Verify that all submitted mediaAssetIds exist in database
  if (data.media && data.media.length > 0) {
    const assetIds = data.media.map((m) => m.mediaAssetId);
    const existingAssets = await prisma.mediaAsset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true },
    });
    if (existingAssets.length !== assetIds.length) {
      return apiError(
        "INVALID_MEDIA",
        "One or more referenced media assets do not exist.",
        400
      );
    }
  }

  const requestedStatus = (body as { status?: ContentStatus }).status;
  const status =
    requestedStatus && Object.values(ContentStatus).includes(requestedStatus)
      ? requestedStatus
      : ContentStatus.DRAFT;

  // If publishing directly, enforce publishing rules (title, shortDesc, cover image)
  if (status === ContentStatus.PUBLISHED) {
    const publishValidation = validateForPublishing({
      title: data.title,
      slug: data.slug,
      categoryId: data.categoryId,
      shortDescription: data.shortDescription,
      media: data.media,
    });
    if (!publishValidation.isValid) {
      return apiError(
        "PUBLISH_CRITERIA_UNMET",
        publishValidation.errors.join(" "),
        422
      );
    }
  }

  // 4. Create project inside transaction with highlights and media
  const newProject = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
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
        publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        highlights: {
          create: data.highlights.map((text, idx) => ({
            text,
            sortOrder: idx,
          })),
        },
        media: {
          create: data.media.map((m, idx) => ({
            mediaAssetId: m.mediaAssetId,
            role: m.role,
            sortOrder: m.sortOrder ?? idx,
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

  // 5. Log activity
  await logActivity({
    adminUserId: adminContext.adminUser.id,
    action: ActivityAction.PROJECT_CREATED,
    entityType: "Project",
    entityId: newProject.id,
    summary: `Created project "${newProject.title}" as ${newProject.status}`,
  });

  return apiSuccess(serializeBigInt(newProject), undefined, 201);
}
