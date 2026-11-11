import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, getCorsHeaders } from "@/lib/http/response";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/v1/public/services
 * Returns active service categories and services for customer navigation.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return apiSuccess(categories, undefined, 200, corsHeaders);
}

