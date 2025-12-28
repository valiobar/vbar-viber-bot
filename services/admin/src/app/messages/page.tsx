/**
 * Messages List Page
 *
 * Displays a list of messages with pagination, search, filtering, and sorting.
 * Uses MessagesList component for the table display.
 */

import MessagesList from "@/components/bot/message/MessagesList";
import type { ListMessagesResult } from "@/domains/message/ports/in/ListMessagesUseCase";
import type { ApiResponse } from "@vbar/shared";

/**
 * Fetch initial messages data for SSR
 *
 * Note: For server components, we can call use cases directly or use API routes.
 * Using API routes here to maintain consistency with client-side fetching.
 */
async function getMessages(searchParams: {
  [key: string]: string | string[] | undefined;
}): Promise<ListMessagesResult | null> {
  try {
    const params = new URLSearchParams();

    // Add query parameters
    if (searchParams.page) params.append("page", String(searchParams.page));
    if (searchParams.limit) params.append("limit", String(searchParams.limit));
    if (searchParams.hidden !== undefined)
      params.append("hidden", String(searchParams.hidden));
    if (searchParams.type) params.append("type", String(searchParams.type));
    if (searchParams.search)
      params.append("search", String(searchParams.search));

    // For server-side rendering in Next.js, we can use absolute URL with localhost
    // or call the use cases directly. Using API route for consistency.
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window === "undefined"
        ? `http://localhost:${process.env.PORT || 3000}`
        : "");
    const url = `${baseUrl}/api/messages?${params.toString()}`;

    const response = await fetch(url, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      return null;
    }

    const data: ApiResponse<ListMessagesResult> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return null;
  }
}

interface MessagesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function MessagesPage({
  searchParams,
}: MessagesPageProps) {
  const initialData = await getMessages(searchParams);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Messages
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Manage bot messages and content
          </p>
        </div>
      </div>

      <MessagesList initialData={initialData || undefined} />
    </main>
  );
}
