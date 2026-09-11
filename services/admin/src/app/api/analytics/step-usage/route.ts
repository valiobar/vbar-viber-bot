/**
 * GET /api/analytics/step-usage — step usage statistics
 *
 * Query: startDate?, endDate? (ISO date strings; default last 30 days)
 */

import { AnalyticsRepository } from "@/domains/analytics/AnalyticsRepository";
import { AnalyticsService } from "@/domains/analytics/AnalyticsService";
import { StepUsageEventModel } from "@/domains/analytics/StepUsageEventModel";
import { StepModel } from "@/domains/step/StepModel";
import { withDb, jsonOk, jsonError, ErrorCode } from "@/lib/api/routeHelpers";

const DEFAULT_RANGE_DAYS = 30;

const createAnalyticsService = (): AnalyticsService =>
  new AnalyticsService(new AnalyticsRepository(StepUsageEventModel), StepModel);

export async function GET(request: Request) {
  return withDb(
    async () => {
      const { searchParams } = new URL(request.url);

      const endParam = searchParams.get("endDate");
      const startParam = searchParams.get("startDate");

      const endDate = endParam ? new Date(endParam) : new Date();
      const startDate = startParam
        ? new Date(startParam)
        : new Date(endDate.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return jsonError(
          ErrorCode.VALIDATION,
          "startDate and endDate must be valid ISO dates",
          400
        );
      }
      if (startDate > endDate) {
        return jsonError(
          ErrorCode.VALIDATION,
          "startDate must be before endDate",
          400
        );
      }

      const result = await createAnalyticsService().getStepUsageStats(
        startDate,
        endDate
      );
      return jsonOk(result);
    },
    { fallback: "An unexpected error occurred while loading step usage stats" }
  );
}
