/**
 * Steps list view
 *
 * Route body for `/steps`. Loads initial data for SSR, then the list widget.
 */

import { StepsList } from "@/widgets/step-list";
import {
  listSteps,
  type ListStepsFilters,
  type ListStepsResult,
} from "@/entities/step";

type SearchParams = { [key: string]: string | string[] | undefined };

const getSteps = async (
  searchParams: SearchParams
): Promise<ListStepsResult | null> => {
  try {
    const filters: ListStepsFilters = {};
    if (searchParams.hidden !== undefined) {
      filters.hidden = String(searchParams.hidden) === "true";
    }
    if (searchParams.isAi !== undefined) {
      filters.isAi = String(searchParams.isAi) === "true";
    }
    if (searchParams.search) {
      filters.search = String(searchParams.search);
    }
    if (searchParams.trigger) {
      filters.trigger = String(searchParams.trigger);
    }

    return await listSteps(filters, {
      page: searchParams.page ? Number(searchParams.page) : undefined,
      limit: searchParams.limit ? Number(searchParams.limit) : undefined,
    });
  } catch (error) {
    console.error("Error fetching steps:", error);
    return null;
  }
};

interface StepsViewProps {
  searchParams: SearchParams;
}

export const StepsView = async ({ searchParams }: StepsViewProps) => {
  const initialData = await getSteps(searchParams);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Steps
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Manage bot conversation steps and flows
          </p>
        </div>
      </div>

      <StepsList initialData={initialData || undefined} />
    </main>
  );
};
