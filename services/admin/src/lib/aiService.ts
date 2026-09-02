import { ConfigHelper } from "@vbar/shared";
import { NextResponse } from "next/server";

const aiBaseUrl = () =>
  ConfigHelper.getEnv("AI_SERVICE_URL", "http://localhost:3002");

/**
 * Forward a request to the AI service with X-Service-Token.
 * Passes the AI ApiResponse body and status through unchanged.
 */
export async function forwardToAiService(
  path: string,
  init: { method: string; body?: BodyInit; headers?: Record<string, string> }
): Promise<NextResponse> {
  // Empty default: ConfigHelper.getEnv throws when unset and has no default.
  const token = ConfigHelper.getEnv("AI_SERVICE_TOKEN", "");
  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "AI_SERVICE_NOT_CONFIGURED",
          message: "AI_SERVICE_TOKEN is not configured on the admin service",
        },
      },
      { status: 503 }
    );
  }
  try {
    const response = await fetch(`${aiBaseUrl()}${path}`, {
      ...init,
      headers: { ...init.headers, "X-Service-Token": token },
    });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? {}, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "AI_SERVICE_UNAVAILABLE",
          message: "Could not reach the AI service — is it running with RAG enabled?",
        },
      },
      { status: 502 }
    );
  }
}
