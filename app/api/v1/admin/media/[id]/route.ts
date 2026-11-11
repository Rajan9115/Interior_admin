import { NextRequest } from "next/server";
import { requireAdmin, verifyMutationOrigin } from "@/lib/auth/guard";
import { updateMediaMetadataSchema } from "@/lib/validation/media";
import { mediaService } from "@/server/services/media.service";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/http/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await requireAdmin(request);
    if (!authContext) {
      return apiUnauthorized();
    }

    const { id } = await params;
    const asset = await mediaService.getMediaById(id);
    return apiSuccess(asset);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Media asset not found";
    return apiNotFound(message);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await requireAdmin(request);
    if (!authContext) {
      return apiUnauthorized();
    }

    if (!verifyMutationOrigin(request)) {
      return apiForbidden("Cross-site request blocked.");
    }

    const { id } = await params;
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = updateMediaMetadataSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = [issue.message];
      }
      return apiError(
        "VALIDATION_ERROR",
        "Invalid metadata update parameters",
        400,
        fieldErrors
      );
    }

    const updated = await mediaService.updateMediaMetadata(
      authContext.adminUser.id,
      id,
      parseResult.data
    );

    return apiSuccess(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return apiError("UPDATE_FAILED", message, 400);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await requireAdmin(request);
    if (!authContext) {
      return apiUnauthorized();
    }

    if (!verifyMutationOrigin(request)) {
      return apiForbidden("Cross-site request blocked.");
    }

    const { id } = await params;
    const result = await mediaService.deleteMediaAsset(
      authContext.adminUser.id,
      id
    );

    return apiSuccess(result);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "CONFLICT") {
      return apiError("CONFLICT", err.message || "Asset is in use", 409);
    }
    const message = error instanceof Error ? error.message : "Deletion failed";
    return apiError("DELETION_FAILED", message, 400);
  }
}
