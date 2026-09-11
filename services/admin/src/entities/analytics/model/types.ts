import type {
  StepUsageTotal,
  StepUsageDailyCount,
  StepUsageStatsResult,
} from "@/domains/analytics/types";

export type { StepUsageTotal, StepUsageDailyCount, StepUsageStatsResult };

export interface StepUsageQuery {
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}
