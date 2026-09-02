/**
 * Messages list view
 *
 * Route body for `/messages`. Loads initial data for SSR, then the list widget.
 */

import { MessagesList } from "@/widgets/message-list";
import {
  listMessages,
  type ListMessagesFilters,
  type ListMessagesResult,
} from "@/entities/message";

type SearchParams = { [key: string]: string | string[] | undefined };

const getMessages = async (
  searchParams: SearchParams
): Promise<ListMessagesResult | null> => {
  try {
    const filters: ListMessagesFilters = {};
    if (searchParams.hidden !== undefined) {
      filters.hidden = String(searchParams.hidden) === "true";
    }
    if (searchParams.type) {
      filters.type = String(searchParams.type) as ListMessagesFilters["type"];
    }
    if (searchParams.search) {
      filters.search = String(searchParams.search);
    }

    return await listMessages(filters, {
      page: searchParams.page ? Number(searchParams.page) : undefined,
      limit: searchParams.limit ? Number(searchParams.limit) : undefined,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return null;
  }
};

interface MessagesViewProps {
  searchParams: SearchParams;
}

export const MessagesView = async ({ searchParams }: MessagesViewProps) => {
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
};
