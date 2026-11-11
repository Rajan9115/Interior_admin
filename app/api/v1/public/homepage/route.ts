import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeBigInt } from "@/lib/db/prisma";
import { apiSuccess, getCorsHeaders } from "@/lib/http/response";
import { HomepageRepository } from "@/server/repositories/homepage.repository";
import { SettingsRepository } from "@/server/repositories/settings.repository";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/v1/public/homepage
 * Returns published curated homepage projects and approved public settings.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  let featuredProjects = await HomepageRepository.getCuratedHomepageProjects();

  // If no explicitly curated projects are saved yet, fallback to any published projects with isFeatured=true
  if (featuredProjects.length === 0) {
    const fallback = await prisma.project.findMany({
      where: {
        status: "PUBLISHED",
        isFeatured: true,
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      take: 6,
      include: {
        category: true,
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: "asc" },
        },
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    featuredProjects = fallback as unknown as typeof featuredProjects;
  }

  const allSettings = await SettingsRepository.getAllSettings();
  const publicSettings = {
    business_name: allSettings.business_name,
    tagline: allSettings.tagline,
    hero_title: allSettings.hero_title,
    hero_description: allSettings.hero_description,
    phone: allSettings.phone,
    whatsapp: allSettings.whatsapp,
    address: allSettings.address,
    hours: allSettings.hours,
  };

  return apiSuccess(
    {
      featuredProjects: serializeBigInt(featuredProjects),
      settings: publicSettings,
    },
    undefined,
    200,
    corsHeaders
  );
}

