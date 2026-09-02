import type { ApiResponse } from "@vbar/shared";

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type TokenGetter = () => string | null | undefined;

let tokenGetter: TokenGetter | null = null;

/**
 * Register a callback that returns the current access token.
 * Called at app init from the session entity so `shared` never imports it.
 */
export const registerTokenGetter = (getter: TokenGetter) => {
  tokenGetter = getter;
};

const resolveUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (typeof window === "undefined") {
    const base =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    return `${base}${path}`;
  }

  return path;
};

export type HttpOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Thin client fetch helper: JSON headers, `ApiResponse<T>` unwrap,
 * auth header via the registered token getter, normalized errors.
 */
export const http = async <T>(
  path: string,
  options: HttpOptions = {}
): Promise<T> => {
  const { body, headers, ...rest } = options;
  const token = tokenGetter?.();

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Content-Type") && body !== undefined && !isFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;
  if (isFormData) {
    requestBody = body as FormData;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(resolveUrl(path), {
    ...rest,
    headers: requestHeaders,
    credentials: rest.credentials ?? "include",
    body: requestBody,
  });

  let payload: ApiResponse<T> | undefined;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      throw new HttpError("Invalid response from server", response.status);
    }
  }

  if (!response.ok || payload?.error) {
    throw new HttpError(
      payload?.error?.message || `Request failed (${response.status})`,
      response.status,
      payload?.error?.code,
      payload?.error?.details
    );
  }

  return payload?.data as T;
};
