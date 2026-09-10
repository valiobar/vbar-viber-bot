import { http } from "@/shared";
import type {
  CarouselDTO,
  CreateCarouselInput,
  ListCarouselsFilters,
  ListCarouselsResult,
  UpdateCarouselInput,
} from "../model/types";

const buildListQuery = (
  filters: ListCarouselsFilters = {},
  pagination: { page?: number; limit?: number } = {}
): string => {
  const params = new URLSearchParams();
  if (pagination.page !== undefined) params.set("page", String(pagination.page));
  if (pagination.limit !== undefined) params.set("limit", String(pagination.limit));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.hidden !== undefined) params.set("hidden", String(filters.hidden));
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const listCarousels = (
  filters: ListCarouselsFilters = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<ListCarouselsResult> =>
  http<ListCarouselsResult>(`/api/carousels${buildListQuery(filters, pagination)}`);

export const getCarousel = (id: string): Promise<CarouselDTO> =>
  http<CarouselDTO>(`/api/carousels/${id}`);

export const createCarousel = (input: CreateCarouselInput): Promise<CarouselDTO> =>
  http<CarouselDTO>("/api/carousels", { method: "POST", body: input });

export const updateCarousel = (id: string, input: UpdateCarouselInput): Promise<CarouselDTO> =>
  http<CarouselDTO>(`/api/carousels/${id}`, { method: "PUT", body: input });

export const deleteCarousel = (id: string): Promise<void> =>
  http<void>(`/api/carousels/${id}`, { method: "DELETE" });
