import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { apiSuccess, apiUnauthorized } from "@/lib/http/response";

export async function GET(request: NextRequest) {
  const context = await requireAdmin(request);

  if (!context) {
    return apiUnauthorized("No active admin session found.");
  }

  return apiSuccess(
    {
      user: {
        id: context.adminUser.id,
        email: context.adminUser.email,
        displayName: context.adminUser.displayName,
        role: context.adminUser.role,
        lastLoginAt: context.adminUser.lastLoginAt,
        createdAt: context.adminUser.createdAt,
      },
    },
    undefined,
    200
  );
}

