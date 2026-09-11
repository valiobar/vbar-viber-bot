import { http } from "@/shared";
import type { StepUsageQuery, StepUsageStatsResult } from "../model/types";

const buildQuery = (query: StepUsageQuery = {}): string => {
  const params = new URLSearchParams();
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const getStepUsageStats = (
  query: StepUsageQuery = {}
): Promise<StepUsageStatsResult> =>
  http<StepUsageStatsResult>(`/api/analytics/step-usage${buildQuery(query)}`);
