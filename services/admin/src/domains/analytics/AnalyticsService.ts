/**
 * Analytics application service
 *
 * Route → service → repository for step-usage statistics.
 * Resolves step names from StepModel in a single $in batch (no N+1).
 */

import { Model } from "mongoose";
import type { IStepDocument } from "@/domains/step/StepModel";
import { AnalyticsRepository } from "./AnalyticsRepository";
import type { StepUsageStatsResult } from "./types";

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly stepModel: Model<IStepDocument>
  ) {}

  async getStepUsageStats(
    startDate: Date,
    endDate: Date
  ): Promise<StepUsageStatsResult> {
    const [totals, daily] = await Promise.all([
      this.repository.aggregateStepTotals(startDate, endDate),
      this.repository.aggregateDailyCounts(startDate, endDate),
    ]);

    const stepIds = totals.map((t) => t._id);
    const steps = await this.stepModel
      .find({ _id: { $in: stepIds } })
      .select("humanReadableName")
      .lean();
    const nameById = new Map(
      steps.map((s) => [String(s._id), s.humanReadableName])
    );

    return {
      totals: totals.map((t) => ({
        stepId: String(t._id),
        stepName: nameById.get(String(t._id)) ?? "(deleted step)",
        triggers: t.triggers,
        sources: t.sources,
        total: t.total,
        uniqueUsers: t.uniqueUsers,
        lastUsedAt: t.lastUsedAt.toISOString(),
      })),
      daily: daily.map((d) => ({ date: d._id, count: d.count })),
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }
}
