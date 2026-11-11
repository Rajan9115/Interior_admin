import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { requestSignatureSchema } from "@/lib/validation/media";
import { mediaService } from "@/server/services/media.service";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/http/response";

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAdmin(request);
    if (!authContext) {
      return apiUnauthorized();
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = requestSignatureSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = [issue.message];
      }
      return apiError(
        "VALIDATION_ERROR",
        "Invalid signature request parameters",
        400,
        fieldErrors
      );
    }

    const signatureData = mediaService.generateSignature(
      authContext.adminUser.id,
      parseResult.data
    );

    return apiSuccess(signatureData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
