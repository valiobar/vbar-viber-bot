/**
 * MongoDB Step Repository
 *
 * Handles conversion between MongoDB documents and Step domain entities.
 */

import { Model, Types } from "mongoose";
import { PaginationParams } from "@vbar/shared";
import { Step } from "./Step";
import { IStepDocument } from "./StepModel";

/**
 * Filter options for querying steps
 */
export interface StepFilters {
  hidden?: boolean;
  search?: string;
  trigger?: string;
  isAi?: boolean;
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllResult {
  steps: Step[];
  total: number;
}

/**
 * Step persistence operations using MongoDB/Mongoose.
 */
export class StepRepository {
  constructor(private readonly stepModel: Model<IStepDocument>) {}

  /**
   * Creates a new step in the database
   *
   * @param step - Step entity to create
   * @returns Created step with generated ID
   */
  async create(step: Step): Promise<Step> {
    const document = this.entityToDocument(step);
    const savedDoc = await this.stepModel.create(document);
    return this.documentToEntity(savedDoc);
  }

  /**
   * Updates an existing step
   *
   * @param id - Step ID
   * @param step - Updated step entity
   * @returns Updated step entity
   * @throws Error if step not found
   */
  async update(id: string, step: Step): Promise<Step> {
    const document = this.entityToDocument(step);

    // Remove _id from document to avoid conflicts
    const { _id, ...updateData } = document as any;

    const updatedDoc = await this.stepModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (!updatedDoc) {
      throw new Error(`Step with id ${id} not found`);
    }

    return this.documentToEntity(updatedDoc);
  }

  /**
   * Deletes a step by ID
   *
   * @param id - Step ID to delete
   * @throws Error if step not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.stepModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new Error(`Step with id ${id} not found`);
    }
  }

  /**
   * Finds a step by ID
   *
   * @param id - Step ID
   * @returns Step entity or null if not found
   */
  async findById(id: string): Promise<Step | null> {
    const doc = await this.stepModel.findById(id).exec();

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Finds all steps with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, search, trigger)
   * @param pagination - Optional pagination parameters
   * @returns Object containing steps array and total count
   */
  async findAll(
    filters?: StepFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult> {
    const query = this.buildQuery(filters);

    // Get total count
    const total = await this.stepModel.countDocuments(query).exec();

    // Build query with pagination
    let mongooseQuery = this.stepModel.find(query);

    // Apply pagination
    if (pagination && pagination.page && pagination.limit) {
      const skip = (pagination.page - 1) * pagination.limit;
      mongooseQuery = mongooseQuery.skip(skip).limit(pagination.limit);
    }

    // Apply sorting (default: createdAt descending)
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

    const docs = await mongooseQuery.exec();

    // Convert documents to entities with error tolerance to avoid failing the entire list
    const steps: Step[] = [];
    for (const doc of docs) {
      try {
        steps.push(this.documentToEntity(doc));
      } catch (error) {
        // Log and skip invalid documents to prevent 500s on list endpoint
        console.error(
          "Failed to convert step document to entity",
          { id: doc._id?.toString?.() },
          error
        );
      }
    }

    return {
      steps,
      // Use the actual database count for correct pagination
      // Even if some steps fail conversion, pagination should reflect the real total
      total,
    };
  }

  /**
   * Checks if a step exists by ID
   *
   * @param id - Step ID to check
   * @returns True if step exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.stepModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  /**
   * Finds steps by trigger string
   * Searches for steps that contain the specified trigger string in their trigger array
   *
   * @param trigger - Trigger string to search for
   * @returns Array of steps that contain the trigger string in their trigger array
   */
  async findByTrigger(trigger: string): Promise<Step[]> {
    // Use MongoDB $in operator to find steps where trigger array contains the search string
    const docs = await this.stepModel
      .find({ trigger: { $in: [trigger] } })
      .exec();

    // Convert documents to entities
    const steps: Step[] = [];
    for (const doc of docs) {
      try {
        steps.push(this.documentToEntity(doc));
      } catch (error) {
        // Log and skip invalid documents
        console.error(
          "Failed to convert step document to entity in findByTrigger",
          { id: doc._id?.toString?.(), trigger },
          error
        );
      }
    }

    return steps;
  }

  /**
   * Converts MongoDB document to Step domain entity
   *
   * @param doc - MongoDB document
   * @returns Step domain entity
   */
  private documentToEntity(doc: IStepDocument): Step {
    return Step.fromDatabaseDocument({
      _id: doc._id,
      humanReadableName: doc.humanReadableName,
      trigger: doc.trigger,
      content: doc.content,
      keyboard: doc.keyboard,
      hidden: doc.hidden,
      isAi: doc.isAi,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Converts Step domain entity to MongoDB document format
   *
   * @param step - Step domain entity
   * @returns MongoDB document object
   */
  private entityToDocument(step: Step): Partial<IStepDocument> {
    // Convert content array (Message IDs) to ObjectId references
    const content = step.content.map((id) => new Types.ObjectId(id));

    // Convert keyboard reference (optional) to ObjectId or null
    let keyboard: Types.ObjectId | null = null;
    if (step.keyboard) {
      keyboard = new Types.ObjectId(step.keyboard);
    }

    return {
      humanReadableName: step.humanReadableName,
      trigger: step.trigger,
      content,
      keyboard,
      hidden: step.hidden,
      isAi: step.isAi,
      createdAt: new Date(step.createdAt),
      updatedAt: new Date(step.updatedAt),
    };
  }

  /**
   * Builds Mongoose query from filters
   *
   * @param filters - Filter options
   * @returns Mongoose query object
   */
  private buildQuery(filters?: StepFilters): any {
    const query: any = {};

    if (filters) {
      if (filters.hidden !== undefined) {
        query.hidden = filters.hidden;
      }

      if (filters.isAi !== undefined) {
        query.isAi = filters.isAi;
      }

      if (filters.search) {
        // Search in humanReadableName using case-insensitive regex
        query.humanReadableName = { $regex: filters.search, $options: "i" };
      }

      if (filters.trigger) {
        // Search for steps where trigger array contains the specified trigger string
        query.trigger = { $in: [filters.trigger] };
      }
    }

    return query;
  }
}
