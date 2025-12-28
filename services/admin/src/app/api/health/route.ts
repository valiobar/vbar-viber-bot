import { NextResponse } from "next/server";
import { HealthCheckResponse } from "@vbar/shared";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  try {
    // Check MongoDB connection
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (db) {
      await db.admin().ping();
    } else {
      throw new Error("Database connection not available");
    }

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
