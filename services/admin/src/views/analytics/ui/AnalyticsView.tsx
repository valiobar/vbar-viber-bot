/**
 * Analytics view
 *
 * Route body for `/analytics`. Loads initial step-usage stats for SSR,
 * then the interactive widget.
 */

import { StepUsageStats } from "@/widgets/step-usage-stats";
import {
  getStepUsageStats,
  type StepUsageStatsResult,
} from "@/entities/analytics";

const getInitialStats = async (): Promise<StepUsageStatsResult | null> => {
  try {
    return await getStepUsageStats();
  } catch (error) {
    console.error("Error fetching step usage stats:", error);
    return null;
  }
};

export const AnalyticsView = async () => {
  const initialData = await getInitialStats();

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Step usage statistics from the Viber bot
        </p>
      </div>

      <StepUsageStats initialData={initialData || undefined} />
    </main>
  );
};
