import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { SettingsService } from "@/server/services/settings.service";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/http/response";

/**
 * GET /api/v1/admin/settings
 * Reads all contractor and site settings merged with defaults.
 */
export async function GET(request: NextRequest) {
  const adminContext = await requireAdmin(request);
  if (!adminContext) {
    return apiUnauthorized();
  }

  try {
    const settings = await SettingsService.getAllSettings();
    return apiSuccess(settings);
  } catch (error) {
    return apiError("SERVER_ERROR", error instanceof Error ? error.message : "Failed to load settings", 500);
  }
}

/**
 * PATCH /api/v1/admin/settings
 * Updates allowlisted settings with strict validation.
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
    const updated = await SettingsService.updateSettings(body, adminContext.adminUser.id);
    return apiSuccess(updated);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400);
    }
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Failed to update settings", 400);
  }
}
