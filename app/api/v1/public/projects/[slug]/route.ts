import { NextRequest, NextResponse } from "next/server";
import { findPublishedProjectBySlug } from "@/server/repositories/project.repository";
import { apiSuccess, apiNotFound, getCorsHeaders } from "@/lib/http/response";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/v1/public/projects/[slug]
 * Returns single published project. Draft and archived projects return 404.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const corsHeaders = getCorsHeaders(request);
  const { slug } = await params;

  if (!slug) {
    return apiNotFound("Project not found.", corsHeaders);
  }

  const project = await findPublishedProjectBySlug(slug.trim().toLowerCase());

  if (!project) {
    return apiNotFound("Project not found.", corsHeaders);
  }

  return apiSuccess(project, undefined, 200, corsHeaders);
}

