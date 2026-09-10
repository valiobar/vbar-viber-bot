/**
 * Carousel application service
 *
 * Route → service → repository for carousel CRUD.
 * Cards are validated and flattened into Viber-shaped Buttons on write.
 */

import { PaginationParams } from "@vbar/shared";
import { paginate } from "@/lib/api/paginate";
import type { CarouselDTO, CarouselCardDTO } from "./types";
import { CarouselRepository, CarouselFilters } from "./CarouselRepository";
import { CarouselValidators } from "./lib/CarouselValidators";
import { CardFlattener } from "./lib/CardFlattener";

export interface CreateCarouselInput {
  humanReadableName: string;
  hidden?: boolean;
  BgColor?: string | null;
  ButtonsGroupColumns?: number;
  ButtonsGroupRows?: number;
  Cards: CarouselCardDTO[];
}

export interface UpdateCarouselInput {
  humanReadableName?: string;
  hidden?: boolean;
  BgColor?: string | null;
  ButtonsGroupColumns?: number;
  ButtonsGroupRows?: number;
  Cards?: CarouselCardDTO[];
}

export interface ListCarouselsFilters {
  hidden?: boolean;
  search?: string;
}

export interface ListCarouselsResult {
  carousels: CarouselDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CarouselService {
  constructor(private readonly carouselRepository: CarouselRepository) {}

  async list(
    filters?: ListCarouselsFilters,
    pagination?: PaginationParams
  ): Promise<ListCarouselsResult> {
    const repositoryFilters: CarouselFilters = {
      hidden: filters?.hidden,
      search: filters?.search,
    };
    const result = await this.carouselRepository.findAll(
      repositoryFilters,
      pagination
    );
    return {
      carousels: result.carousels,
      total: result.total,
      ...paginate(result.total, pagination),
    };
  }

  async get(id: string): Promise<CarouselDTO> {
    const carousel = await this.carouselRepository.findById(id);
    if (!carousel) throw new Error(`Carousel with ID ${id} not found`);
    return carousel;
  }

  async create(input: CreateCarouselInput): Promise<CarouselDTO> {
    const data = this.buildWriteData({
      humanReadableName: input.humanReadableName,
      hidden: input.hidden ?? false,
      BgColor: input.BgColor ?? null,
      ButtonsGroupColumns: input.ButtonsGroupColumns ?? 6,
      ButtonsGroupRows: input.ButtonsGroupRows ?? 7,
      Cards: input.Cards,
    });
    return this.carouselRepository.create(data);
  }

  async update(id: string, input: UpdateCarouselInput): Promise<CarouselDTO> {
    const existing = await this.get(id);
    const data = this.buildWriteData({
      humanReadableName: input.humanReadableName ?? existing.humanReadableName,
      hidden: input.hidden ?? existing.hidden,
      BgColor: input.BgColor !== undefined ? input.BgColor : existing.BgColor,
      ButtonsGroupColumns:
        input.ButtonsGroupColumns ?? existing.ButtonsGroupColumns,
      ButtonsGroupRows: input.ButtonsGroupRows ?? existing.ButtonsGroupRows,
      Cards: input.Cards ?? existing.Cards,
    });
    return this.carouselRepository.update(id, data);
  }

  /** Orphan message references are allowed (same policy as keyboards/messages). */
  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.carouselRepository.delete(id);
  }

  /** Validates cards and computes the flattened Buttons layout. */
  private buildWriteData(fields: {
    humanReadableName: string;
    hidden: boolean;
    BgColor: string | null;
    ButtonsGroupColumns: number;
    ButtonsGroupRows: number;
    Cards: CarouselCardDTO[];
  }) {
    CarouselValidators.validateCarousel(fields);
    const Buttons = CardFlattener.flattenCards(
      fields.Cards,
      fields.ButtonsGroupColumns,
      fields.ButtonsGroupRows
    );
    return {
      type: "rich_media" as const,
      ...fields,
      humanReadableName: fields.humanReadableName.trim(),
      Buttons: Buttons as CarouselDTO["Buttons"],
    };
  }
}
