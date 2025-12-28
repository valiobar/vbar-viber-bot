/**
 * Keyboards List Page
 *
 * Displays a list of keyboards with pagination, search, filtering, and sorting.
 * Uses KeyboardsList component for the table display.
 */

import KeyboardsList from "@/components/bot/keyboard/KeyboardsList";
import type { ListKeyboardsResult } from "@/domains/keyboard/ports/in/ListKeyboardsUseCase";
import type { ApiResponse } from "@vbar/shared";

/**
 * Fetch initial keyboards data for SSR
 *
 * Note: For server components, we can call use cases directly or use API routes.
 * Using API routes here to maintain consistency with client-side fetching.
 */
async function getKeyboards(searchParams: {
  [key: string]: string | string[] | undefined;
}): Promise<ListKeyboardsResult | null> {
  try {
    const params = new URLSearchParams();

    // Add query parameters
    if (searchParams.page) params.append("page", String(searchParams.page));
    if (searchParams.limit) params.append("limit", String(searchParams.limit));
    if (searchParams.hidden !== undefined)
      params.append("hidden", String(searchParams.hidden));
    if (searchParams.isBroadcast !== undefined)
      params.append("isBroadcast", String(searchParams.isBroadcast));
    if (searchParams.search)
      params.append("search", String(searchParams.search));

    // For server-side rendering in Next.js, we can use absolute URL with localhost
    // or call the use cases directly. Using API route for consistency.
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window === "undefined"
        ? `http://localhost:${process.env.PORT || 3000}`
        : "");
    const url = `${baseUrl}/api/keyboards?${params.toString()}`;

    const response = await fetch(url, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

    const data: ApiResponse<ListKeyboardsResult> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching keyboards:", error);
    return null;
  }
}

interface KeyboardsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function KeyboardsPage({
  searchParams,
}: KeyboardsPageProps) {
  const initialData = await getKeyboards(searchParams);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Keyboards
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Manage bot keyboards and button layouts
          </p>
        </div>
      </div>

      <KeyboardsList initialData={initialData || undefined} />
    </main>
  );
}
