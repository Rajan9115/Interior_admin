import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { createServiceSchema } from "@/lib/validation/service";
import { ServiceService } from "@/server/services/service.service";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/http/response";

/**
 * GET /api/v1/admin/services
 * Returns all service categories with their services and project counts.
 */
export async function GET(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  try {
    const categories = await ServiceService.getCategoriesWithServices(true);
    return apiSuccess(categories);
  } catch (error) {
    return apiError("SERVER_ERROR", error instanceof Error ? error.message : "Failed to load services", 500);
  }
}

/**
 * POST /api/v1/admin/services
 * Creates a new service.
 */
export async function POST(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("CSRF origin mismatch.");
  }

  try {
    const body = await request.json();
    const validated = createServiceSchema.parse(body);

    const service = await ServiceService.createService(validated, adminContext.adminUser.id);
    return apiSuccess(service, undefined, 201);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400);
    }
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to create service", 400);
  }
}
