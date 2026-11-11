import { NextRequest, NextResponse } from "next/server";
import { findPublishedProjects } from "@/server/repositories/project.repository";
import { apiSuccess, getCorsHeaders } from "@/lib/http/response";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/v1/public/projects
 * Public endpoint returning ONLY published projects with public-safe fields.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") || undefined;
  const featuredParam = searchParams.get("featured");
  const featured =
    featuredParam === "true" ? true : featuredParam === "false" ? false : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;

  const projects = await findPublishedProjects({
    categorySlug: category,
    featured,
    limit,
  });

  return apiSuccess(projects, undefined, 200, corsHeaders);
}

