import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { updateHomepageFeaturedSchema } from "@/lib/validation/homepage";
import { HomepageService } from "@/server/services/homepage.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/http/response";

/**
 * GET /api/v1/admin/homepage
 * Returns curated homepage projects and all eligible published projects.
 */
export async function GET(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  try {
    const [curated, eligible] = await Promise.all([
      HomepageService.getCuratedProjects(),
      HomepageService.getEligibleProjects(),
    ]);

    return apiSuccess({
      curated: serializeBigInt(curated),
      eligible: serializeBigInt(eligible),
    });
  } catch (error) {
    return apiError("SERVER_ERROR", error instanceof Error ? error.message : "Failed to load homepage data", 500);
  }
}

/**
 * PUT /api/v1/admin/homepage
 * Updates curated sequence of featured projects on the homepage.
 */
export async function PUT(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("CSRF origin mismatch.");
  }

  try {
    const body = await request.json();
    const validated = updateHomepageFeaturedSchema.parse(body);

    await HomepageService.updateCuratedProjects(validated.projectIds, adminContext.adminUser.id);
    return apiSuccess({ success: true, count: validated.projectIds.length });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400);
    }
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to update homepage sequence", 400);
  }
}
