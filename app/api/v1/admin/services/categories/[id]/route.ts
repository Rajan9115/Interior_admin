import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { updateCategorySchema } from "@/lib/validation/service";
import { ServiceService } from "@/server/services/service.service";
import { ServiceRepository } from "@/server/repositories/service.repository";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/http/response";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/admin/services/categories/[id]
 * Updates category details.
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
    const validated = updateCategorySchema.parse(body);

    const updated = await ServiceService.updateCategory(id, validated, adminContext.adminUser.id);
    return apiSuccess(updated);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400);
    }
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to update category", 400);
  }
}

/**
 * DELETE /api/v1/admin/services/categories/[id]
 * Rejects deletion of core trade categories or categories with projects.
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

  const check = await ServiceRepository.validateCategoryDeletion(id);
  if (!check.canDelete) {
    return apiError("PROTECTED_CATEGORY", check.reason || "Category cannot be deleted.", 400);
  }

  return apiError("FORBIDDEN", "Category deletion is restricted by system architecture policy.", 403);
}
