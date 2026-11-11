import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateOwner } from "@/server/services/auth.service";
import { getClientIp, verifyMutationOrigin } from "@/lib/auth/guard";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  apiSuccess,
  apiError,
  apiTooManyRequests,
  apiForbidden,
} from "@/lib/http/response";

export async function POST(request: NextRequest) {
  // 1. CSRF / Origin protection on mutations
  if (!verifyMutationOrigin(request)) {
    return apiForbidden("Cross-origin request rejected.");
  }

  // 2. Parse request JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Malformed JSON payload in request body.", 400);
  }

  // 3. Validate submitted fields with Zod
  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return apiError("VALIDATION_ERROR", "Please review the submitted fields.", 422, fieldErrors);
  }

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  // 4. Authenticate owner
  const result = await authenticateOwner(validation.data, {
    ip: clientIp,
    userAgent,
  });

  if (result.rateLimited) {
    const response = apiTooManyRequests(result.error);
    if (result.retryAfterSeconds) {
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
    }
    return response;
  }

  if (!result.success || !result.rawToken || !result.user) {
    return apiError(
      "INVALID_CREDENTIALS",
      result.error ?? "Invalid email or password.",
      401
    );
  }

  // 5. Build success response with secure HttpOnly session cookie
  const response = apiSuccess(
    result.user,
    { message: "Signed in successfully." },
    200
  );

  response.cookies.set(
    SESSION_COOKIE_NAME,
    result.rawToken,
    getSessionCookieOptions()
  );

  return response;
}

