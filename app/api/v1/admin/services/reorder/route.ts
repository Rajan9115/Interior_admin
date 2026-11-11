import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { reorderServicesSchema } from "@/lib/validation/service";
import { ServiceService } from "@/server/services/service.service";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/http/response";

/**
 * PATCH /api/v1/admin/services/reorder
 * Reorders services.
 */
export async function PATCH(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("CSRF origin mismatch.");
  }

  try {
    const body = await request.json();
    const validated = reorderServicesSchema.parse(body);

    await ServiceService.reorderServices(validated.items, adminContext.adminUser.id);
    return apiSuccess({ success: true, count: validated.items.length });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400);
    }
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to reorder services", 400);
  }
}
