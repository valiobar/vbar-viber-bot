/**
 * Carousels list view
 *
 * Route body for `/carousels`. Loads initial data for SSR, then the list widget.
 */

import { CarouselsList } from "@/widgets/carousel-list";
import {
  listCarousels,
  type ListCarouselsFilters,
  type ListCarouselsResult,
} from "@/entities/carousel";

type SearchParams = { [key: string]: string | string[] | undefined };

const getCarousels = async (
  searchParams: SearchParams
): Promise<ListCarouselsResult | null> => {
  try {
    const filters: ListCarouselsFilters = {};
    if (searchParams.hidden !== undefined) {
      filters.hidden = String(searchParams.hidden) === "true";
    }
    if (searchParams.isTemplate !== undefined) {
      filters.isTemplate = String(searchParams.isTemplate) === "true";
    }
    if (searchParams.search) {
      filters.search = String(searchParams.search);
    }

    return await listCarousels(filters, {
      page: searchParams.page ? Number(searchParams.page) : undefined,
      limit: searchParams.limit ? Number(searchParams.limit) : undefined,
    });
  } catch (error) {
    console.error("Error fetching carousels:", error);
    return null;
  }
};

interface CarouselsViewProps {
  searchParams: SearchParams;
}

export const CarouselsView = async ({ searchParams }: CarouselsViewProps) => {
  const initialData = await getCarousels(searchParams);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Carousels
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Manage rich media carousels (Viber rich_media messages)
          </p>
        </div>
      </div>

      <CarouselsList initialData={initialData || undefined} />
    </main>
  );
};
