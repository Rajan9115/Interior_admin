import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { updateServiceSchema } from "@/lib/validation/service";
import { ServiceService } from "@/server/services/service.service";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/http/response";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/admin/services/[id]
 * Updates an existing service.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("CSRF origin mismatch.");
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateServiceSchema.parse(body);

    const updated = await ServiceService.updateService(id, validated, adminContext.adminUser.id);
    return apiSuccess(updated);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400);
    }
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to update service", 400);
  }
}

/**
 * DELETE /api/v1/admin/services/[id]
 * Deletes a service.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  if (!verifyMutationOrigin(request)) {
    return apiForbidden("CSRF origin mismatch.");
  }

  const { id } = await params;

  try {
    const deleted = await ServiceService.deleteService(id, adminContext.adminUser.id);
    return apiSuccess(deleted);
  } catch (error) {
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to delete service", 400);
  }
}
