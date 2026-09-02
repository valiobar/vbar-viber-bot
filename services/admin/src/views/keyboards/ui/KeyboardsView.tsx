/**
 * Keyboards list view
 *
 * Route body for `/keyboards`. Loads initial data for SSR, then the list widget.
 */

import { KeyboardsList } from "@/widgets/keyboard-list";
import {
  listKeyboards,
  type ListKeyboardsFilters,
  type ListKeyboardsResult,
} from "@/entities/keyboard";

type SearchParams = { [key: string]: string | string[] | undefined };

const getKeyboards = async (
  searchParams: SearchParams
): Promise<ListKeyboardsResult | null> => {
  try {
    const filters: ListKeyboardsFilters = {};
    if (searchParams.hidden !== undefined) {
      filters.hidden = String(searchParams.hidden) === "true";
    }
    if (searchParams.isBroadcast !== undefined) {
      filters.isBroadcast = String(searchParams.isBroadcast) === "true";
    }
    if (searchParams.isTemplate !== undefined) {
      filters.isTemplate = String(searchParams.isTemplate) === "true";
    }
    if (searchParams.search) {
      filters.search = String(searchParams.search);
    }

    return await listKeyboards(filters, {
      page: searchParams.page ? Number(searchParams.page) : undefined,
      limit: searchParams.limit ? Number(searchParams.limit) : undefined,
    });
  } catch (error) {
    console.error("Error fetching keyboards:", error);
    return null;
  }
};

interface KeyboardsViewProps {
  searchParams: SearchParams;
}

export const KeyboardsView = async ({ searchParams }: KeyboardsViewProps) => {
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
};
