import { NextRequest } from "next/server";
import { getSessionContext, verifyMutationOrigin } from "@/lib/auth/guard";
import { terminateSession } from "@/server/services/auth.service";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";
import { apiSuccess, apiForbidden } from "@/lib/http/response";

export async function POST(request: NextRequest) {
  // 1. CSRF / Origin protection
  if (!verifyMutationOrigin(request)) {
    return apiForbidden("Cross-origin request rejected.");
  }

  // 2. Extract session token
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const context = await getSessionContext(request);

  if (token) {
    await terminateSession(token, context?.adminUser.id);
  }

  // 3. Construct response that clears the HttpOnly cookie
  const response = apiSuccess(
    { message: "Signed out successfully." },
    undefined,
    200
  );

  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getSessionCookieOptions(0)
  );

  return response;
}

