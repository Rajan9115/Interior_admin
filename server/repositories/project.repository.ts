import "server-only";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
import { ContentStatus, Prisma } from "@prisma/client";

export interface PublicProjectsFilter {
  categorySlug?: string;
  limit?: number;
}

export interface AdminProjectsFilter {
  query?: string;
  categorySlug?: string;
  status?: ContentStatus;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Public Repository: Returns ONLY published projects and public-safe fields.
 */
export async function findPublishedProjects(filter: PublicProjectsFilter = {}) {
  const where: Prisma.ProjectWhereInput = {
    status: ContentStatus.PUBLISHED,
  };

  if (filter.categorySlug) {
    where.category = { slug: filter.categorySlug };
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }],
    take: filter.limit ? Math.min(filter.limit, 50) : undefined,
    select: {
      id: true,
      title: true,
      slug: true,
      locationLabel: true,
      shortDescription: true,
      description: true,
      completionDate: true,
      isFeatured: true,
      publishedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      media: {
        orderBy: { sortOrder: "asc" },
        select: {
          role: true,
          sortOrder: true,
          mediaAsset: {
            select: {
              id: true,
              publicId: true,
              secureUrl: true,
              mediaType: true,
              resourceType: true,
              width: true,
              height: true,
              durationSeconds: true,
              altText: true,
              caption: true,
              bytes: true,
            },
          },
        },
      },
      highlights: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          text: true,
        },
      },
    },
  });

  return serializeBigInt(projects);
}

/**
 * Public Repository: Returns single published project by slug. Returns null for drafts/archived.
 */
export async function findPublishedProjectBySlug(slug: string) {
  const project = await prisma.project.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      locationLabel: true,
      shortDescription: true,
      description: true,
      completionDate: true,
      isFeatured: true,
      publishedAt: true,
      seoTitle: true,
      seoDescription: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      media: {
        orderBy: { sortOrder: "asc" },
        select: {
          role: true,
          sortOrder: true,
          mediaAsset: {
            select: {
              id: true,
              publicId: true,
              secureUrl: true,
              mediaType: true,
              resourceType: true,
              width: true,
              height: true,
              durationSeconds: true,
              altText: true,
              caption: true,
              bytes: true,
            },
          },
        },
      },
      highlights: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          text: true,
        },
      },
    },
  });

  return project ? serializeBigInt(project) : null;
}

/**
 * Admin Repository: Returns paginated projects with full editorial metadata.
 */
export async function findAdminProjects(filter: AdminProjectsFilter = {}) {
  const page = Math.max(filter.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filter.pageSize ?? 10, 1), 50);
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProjectWhereInput = {};

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.categorySlug) {
    where.category = { slug: filter.categorySlug };
  }

  if (typeof filter.featured === "boolean") {
    where.isFeatured = filter.featured;
  }

  if (filter.query) {
    where.OR = [
      { title: { contains: filter.query, mode: "insensitive" } },
      { shortDescription: { contains: filter.query, mode: "insensitive" } },
      { locationLabel: { contains: filter.query, mode: "insensitive" } },
    ];
  }

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        category: true,
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  return {
    items: serializeBigInt(projects),
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

