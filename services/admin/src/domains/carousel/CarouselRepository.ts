/**
 * MongoDB Carousel Repository
 *
 * Maps ICarouselDocument ↔ CarouselDTO (plain DTO, no entity class).
 */

import { Model } from "mongoose";
import { PaginationParams } from "@vbar/shared";
import type { CarouselDTO } from "./types";
import { ICarouselDocument } from "./CarouselModel";

/**
 * Filter options for querying carousels
 */
export interface CarouselFilters {
  hidden?: boolean;
  search?: string;
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllCarouselsResult {
  carousels: CarouselDTO[];
  total: number;
}

type CarouselWriteData = Omit<CarouselDTO, "id" | "createdAt" | "updatedAt">;

/**
 * Carousel persistence operations using MongoDB/Mongoose.
 */
export class CarouselRepository {
  constructor(private readonly carouselModel: Model<ICarouselDocument>) {}

  /**
   * Creates a new carousel in the database
   *
   * @param data - Carousel write payload (Cards + computed Buttons)
   * @returns Created carousel DTO with generated ID
   */
  async create(data: CarouselWriteData): Promise<CarouselDTO> {
    const doc = await this.carouselModel.create({ ...data, Type: "rich_media" });
    return this.documentToDTO(doc);
  }

  /**
   * Updates an existing carousel
   *
   * @param id - Carousel ID
   * @param data - Full carousel write payload
   * @returns Updated carousel DTO
   * @throws Error if carousel not found
   */
  async update(id: string, data: CarouselWriteData): Promise<CarouselDTO> {
    const doc = await this.carouselModel
      .findByIdAndUpdate(
        id,
        { ...data, Type: "rich_media", updatedAt: new Date() },
        { new: true, runValidators: true }
      )
      .exec();
    if (!doc) throw new Error(`Carousel with id ${id} not found`);
    return this.documentToDTO(doc);
  }

  /**
   * Deletes a carousel by ID
   *
   * @param id - Carousel ID to delete
   * @throws Error if carousel not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.carouselModel.findByIdAndDelete(id).exec();
    if (!result) throw new Error(`Carousel with id ${id} not found`);
  }

  /**
   * Finds a carousel by ID
   *
   * @param id - Carousel ID
   * @returns Carousel DTO or null if not found
   */
  async findById(id: string): Promise<CarouselDTO | null> {
    const doc = await this.carouselModel.findById(id).exec();
    return doc ? this.documentToDTO(doc) : null;
  }

  /**
   * Finds all carousels with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing carousels array and total count
   */
  async findAll(
    filters?: CarouselFilters,
    pagination?: PaginationParams
  ): Promise<FindAllCarouselsResult> {
    const query = this.buildQuery(filters);
    const total = await this.carouselModel.countDocuments(query).exec();

    let mongooseQuery = this.carouselModel.find(query);
    if (pagination?.page && pagination?.limit) {
      mongooseQuery = mongooseQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }
    const docs = await mongooseQuery.sort({ createdAt: -1 }).exec();

    return { carousels: docs.map((doc) => this.documentToDTO(doc)), total };
  }

  /**
   * Checks if a carousel exists by ID
   *
   * @param id - Carousel ID to check
   * @returns True if carousel exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.carouselModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  private documentToDTO(doc: ICarouselDocument): CarouselDTO {
    const plain = doc.toObject();
    return {
      id: doc._id.toString(),
      type: "rich_media",
      humanReadableName: plain.humanReadableName,
      hidden: plain.hidden,
      BgColor: plain.BgColor,
      ButtonsGroupColumns: plain.ButtonsGroupColumns,
      ButtonsGroupRows: plain.ButtonsGroupRows,
      Cards: plain.Cards,
      Buttons: plain.Buttons,
      createdAt: plain.createdAt.toISOString(),
      updatedAt: plain.updatedAt.toISOString(),
    };
  }

  private buildQuery(filters?: CarouselFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (filters?.hidden !== undefined) query.hidden = filters.hidden;
    if (filters?.search) {
      query.humanReadableName = { $regex: filters.search, $options: "i" };
    }
    return query;
  }
}
