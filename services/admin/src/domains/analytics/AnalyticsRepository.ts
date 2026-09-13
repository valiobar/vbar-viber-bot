/**
 * MongoDB Analytics Repository
 *
 * Aggregates raw step-usage events. Concrete Mongo class (no port).
 */

import { Model, Types } from "mongoose";
import type { StepUsageSource } from "@vbar/shared";
import type { IStepUsageEventDocument } from "./StepUsageEventModel";

export interface StepTotalsAggregation {
  _id: Types.ObjectId;
  total: number;
  uniqueUsers: number;
  lastUsedAt: Date;
  triggers: string[];
  sources: StepUsageSource[];
}

export interface DailyCountsAggregation {
  _id: string;
  count: number;
}

export class AnalyticsRepository {
  constructor(private readonly model: Model<IStepUsageEventDocument>) {}

  /**
   * Per-step totals, unique users, and last-used timestamp in the range.
   * Sorted by total descending.
   */
  async aggregateStepTotals(
    startDate: Date,
    endDate: Date
  ): Promise<StepTotalsAggregation[]> {
    return this.model.aggregate<StepTotalsAggregation>([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$stepId",
          total: { $sum: 1 },
          uniqueUsersSet: { $addToSet: "$userId" },
          lastUsedAt: { $max: "$timestamp" },
          triggersSet: { $addToSet: "$trigger" },
          sources: { $addToSet: "$source" },
        },
      },
      {
        $project: {
          total: 1,
          lastUsedAt: 1,
          uniqueUsers: { $size: "$uniqueUsersSet" },
          sources: 1,
          triggers: {
            $filter: {
              input: "$triggersSet",
              as: "t",
              cond: {
                $and: [{ $ne: ["$$t", null] }, { $ne: ["$$t", ""] }],
              },
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }

  /**
   * Daily event counts in the range, keyed as YYYY-MM-DD. Sorted by date.
   */
  async aggregateDailyCounts(
    startDate: Date,
    endDate: Date
  ): Promise<DailyCountsAggregation[]> {
    return this.model.aggregate<DailyCountsAggregation>([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}
