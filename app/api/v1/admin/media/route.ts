import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { listMediaQuerySchema } from "@/lib/validation/media";
import { mediaService } from "@/server/services/media.service";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/http/response";

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAdmin(request);
    if (!authContext) {
      return apiUnauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      q: searchParams.get("q") || undefined,
      type: (searchParams.get("type") as "ALL" | "IMAGE" | "VIDEO") || "ALL",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize")
        ? parseInt(searchParams.get("pageSize")!, 10)
        : 20,
    };

    const parseResult = listMediaQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid query parameters", 400);
    }

    const { items, meta } = await mediaService.listMedia(parseResult.data);
    return apiSuccess(items, meta);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
