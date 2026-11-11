import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
  headers?: HeadersInit
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status, headers });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  fieldErrors?: Record<string, string[]>,
  headers?: HeadersInit
) {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
  };
  return NextResponse.json(body, { status, headers });
}

export function apiUnauthorized(message = "Authentication required. Please sign in.") {
  return apiError("UNAUTHORIZED", message, 401);
}

export function apiForbidden(message = "Access denied. Insufficient permissions.") {
  return apiError("FORBIDDEN", message, 403);
}

export function apiNotFound(message = "Requested resource was not found.") {
  return apiError("NOT_FOUND", message, 404);
}

export function apiTooManyRequests(
  message = "Too many requests. Please try again later."
) {
  return apiError("RATE_LIMITED", message, 429);
}

export function apiInternalError(message = "An unexpected server error occurred.") {
  return apiError("INTERNAL_SERVER_ERROR", message, 500);
}

