/**
 * Steps List Page
 *
 * Displays a list of steps with pagination, search, filtering, and sorting.
 * Uses StepsList component for the table display.
 */

import StepsList from "@/components/bot/step/StepsList";
import type { ListStepsResult } from "@/domains/step/ports/in/ListStepsUseCase";
import type { ApiResponse } from "@vbar/shared";

/**
 * Fetch initial steps data for SSR
 *
 * Note: For server components, we can call use cases directly or use API routes.
 * Using API routes here to maintain consistency with client-side fetching.
 */
async function getSteps(searchParams: {
  [key: string]: string | string[] | undefined;
}): Promise<ListStepsResult | null> {
  try {
    const params = new URLSearchParams();

    // Add query parameters
    if (searchParams.page) params.append("page", String(searchParams.page));
    if (searchParams.limit) params.append("limit", String(searchParams.limit));
    if (searchParams.hidden !== undefined)
      params.append("hidden", String(searchParams.hidden));
    if (searchParams.isAi !== undefined)
      params.append("isAi", String(searchParams.isAi));
    if (searchParams.search)
      params.append("search", String(searchParams.search));
    if (searchParams.trigger)
      params.append("trigger", String(searchParams.trigger));

    // For server-side rendering in Next.js, we can use absolute URL with localhost
    // or call the use cases directly. Using API route for consistency.
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window === "undefined"
        ? `http://localhost:${process.env.PORT || 3000}`
        : "");
    const url = `${baseUrl}/api/steps?${params.toString()}`;

    const response = await fetch(url, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

    const data: ApiResponse<ListStepsResult> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching steps:", error);
    return null;
  }
}

interface StepsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function StepsPage({ searchParams }: StepsPageProps) {
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
}
