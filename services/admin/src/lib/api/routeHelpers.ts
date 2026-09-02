/**
 * Shared helpers for admin content CRUD routes.
 *
 * Helpers + composition only — per-domain services stay explicit.
 */

import { NextResponse } from "next/server";
import type { ApiResponse, PaginationParams, RefreshEvent } from "@vbar/shared";
import { connectToDatabase } from "@/lib/mongodb";
import { publishRefreshEvent } from "@/lib/message-queue-publisher";

export const ErrorCode = {
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL: "INTERNAL_ERROR",
} as const;

export interface MapErrorOptions {
  fallback: string;
  /** Create handlers: a missing referenced resource is a 400, not a 404. */
  notFoundIsValidation?: boolean;
}

export const jsonOk = <T>(
  data: T,
  status = 200
): NextResponse<ApiResponse<T>> => NextResponse.json({ data }, { status });

export const jsonError = (
  code: string,
  message: string,
  status: number
): NextResponse<ApiResponse<never>> =>
  NextResponse.json({ error: { code, message } }, { status });

export const noContent = (): NextResponse =>
  new NextResponse(null, { status: 204 });

export const parsePagination = (
  searchParams: URLSearchParams
): PaginationParams => {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  return {
    page: page > 0 ? page : 1,
    limit: limit > 0 && limit <= 100 ? limit : 10,
  };
};

export const requireString = (
  value: unknown,
  field: string
): NextResponse<ApiResponse<never>> | null => {
  if (!value || typeof value !== "string") {
    return jsonError(
      ErrorCode.VALIDATION,
      `${field} is required and must be a string`,
      400
    );
  }
  return null;
};

export const requireNonEmptyArray = (
  value: unknown,
  field: string
): NextResponse<ApiResponse<never>> | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return jsonError(
      ErrorCode.VALIDATION,
      `${field} is required and must be a non-empty array`,
      400
    );
  }
  return null;
};

export const parseBoolParam = (value: string | null): boolean | undefined => {
  if (value === null) {
    return undefined;
  }
  return value === "true";
};

export const requireId = (
  id: string | undefined,
  resource: string
): NextResponse<ApiResponse<never>> | null => {
  if (!id) {
    return jsonError(ErrorCode.VALIDATION, `${resource} ID is required`, 400);
  }
  return null;
};

export const notifyRefresh = (dataType?: RefreshEvent["dataType"]): void => {
  try {
    publishRefreshEvent(dataType);
  } catch (error) {
    console.error("Failed to publish refresh event:", error);
  }
};

export const mapError = (
  error: unknown,
  options: MapErrorOptions
): NextResponse<ApiResponse<never>> => {
  const message =
    error instanceof Error ? error.message : options.fallback;
  const lower = message.toLowerCase();

  if (lower.includes("not found")) {
    if (options.notFoundIsValidation) {
      return jsonError(ErrorCode.VALIDATION, message, 400);
    }
    return jsonError(ErrorCode.NOT_FOUND, message, 404);
  }

  if (
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("required")
  ) {
    return jsonError(ErrorCode.VALIDATION, message, 400);
  }

  if (lower.includes("in use") || lower.includes("referenced")) {
    return jsonError(ErrorCode.CONFLICT, message, 409);
  }

  return jsonError(ErrorCode.INTERNAL, message, 500);
};

export const withDb = async (
  handler: () => Promise<NextResponse>,
  errorOptions: MapErrorOptions
): Promise<NextResponse> => {
  try {
    await connectToDatabase();
    return await handler();
  } catch (error) {
    console.error(error);
    return mapError(error, errorOptions);
  }
};
