import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { confirmUploadSchema } from "@/lib/validation/media";
import { mediaService } from "@/server/services/media.service";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/http/response";

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAdmin(request);
    if (!authContext) {
      return apiUnauthorized();
    }

    if (!verifyMutationOrigin(request)) {
      return apiForbidden("Cross-site request blocked.");
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = confirmUploadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = [issue.message];
      }
      return apiError(
        "VALIDATION_ERROR",
        "Invalid upload confirmation parameters",
        400,
        fieldErrors
      );
    }

    const asset = await mediaService.confirmUpload(
      authContext.adminUser.id,
      parseResult.data
    );

    return apiSuccess(asset, undefined, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return apiError("VERIFICATION_FAILED", message, 400);
  }
}
