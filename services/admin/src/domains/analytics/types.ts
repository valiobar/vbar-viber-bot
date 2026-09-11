import type { StepUsageSource } from "@vbar/shared";

/**
 * Admin-local analytics result types.
 *
 * Not part of the admin↔viber contract — do not add these to @vbar/shared.
 */

export interface StepUsageTotal {
  stepId: string;
  /** Resolved humanReadableName; "(deleted step)" if the step no longer exists */
  stepName: string;
  /** Distinct matched trigger texts from events (empty for welcome/subscribe-only) */
  triggers: string[];
  /** Distinct initiation sources for this step in the range */
  sources: StepUsageSource[];
  total: number;
  uniqueUsers: number;
  lastUsedAt: string; // ISO
}

export interface StepUsageDailyCount {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface StepUsageStatsResult {
  totals: StepUsageTotal[];
  daily: StepUsageDailyCount[];
  range: { startDate: string; endDate: string };
}
