import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
import { apiSuccess, apiNotFound, getCorsHeaders } from "@/lib/http/response";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/v1/public/services/[slug]
 * Returns active service details and relevant published projects.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const corsHeaders = getCorsHeaders(request);
  const { slug } = await params;

  const service = await prisma.service.findFirst({
    where: {
      slug,
      isActive: true,
      category: { isActive: true },
    },
    include: {
      category: true,
    },
  });

  if (!service) {
    return apiNotFound(`Active service with slug "${slug}" not found.`, corsHeaders);
  }

  // Fetch recent published projects within this category
  const relatedProjects = await prisma.project.findMany({
    where: {
      categoryId: service.categoryId,
      status: "PUBLISHED",
    },
    take: 6,
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }],
    include: {
      category: true,
      media: {
        where: { role: "COVER" },
        include: { mediaAsset: true },
        take: 1,
      },
      highlights: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return apiSuccess(
    {
      service: serializeBigInt(service),
      relatedProjects: serializeBigInt(relatedProjects),
    },
    undefined,
    200,
    corsHeaders
  );
}

