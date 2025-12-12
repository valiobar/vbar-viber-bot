import { NextResponse } from "next/server";
import { HealthCheckResponse } from "@vbar/shared";
import { getDatabase } from "@/lib/mongodb";

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  try {
    // Check MongoDB connection
    const db = await getDatabase();
    await db.admin().ping();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "admin",
      dependencies: {
        database: "connected",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        service: "admin",
        dependencies: {
          database: "disconnected",
        },
      },
      { status: 503 }
    );
  }
}
