import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, getCorsHeaders } from "@/lib/http/response";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

const PUBLIC_SETTINGS_ALLOWLIST = [
  "business_name",
  "phone",
  "email",
  "whatsapp",
  "address",
  "service_areas",
  "hours",
  "gstin",
];

/**
 * GET /api/v1/public/settings
 * Returns public-safe site settings.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  const settings = await prisma.siteSetting.findMany({
    where: {
      key: { in: PUBLIC_SETTINGS_ALLOWLIST },
    },
  });

  const settingsMap: Record<string, unknown> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return apiSuccess(settingsMap, undefined, 200, corsHeaders);
}

