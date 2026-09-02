/**
 * MongoDB Keyboard Repository
 *
 * Handles conversion between MongoDB documents and Keyboard domain entities.
 */

import { Model } from "mongoose";
import { PaginationParams } from "@vbar/shared";
import { Keyboard } from "./Keyboard";
import { Button } from "./Button";
import { IKeyboardDocument } from "./KeyboardModel";

/**
 * Filter options for querying keyboards
 */
export interface KeyboardFilters {
  hidden?: boolean;
  isBroadcast?: boolean;
  isTemplate?: boolean;
  search?: string;
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllResult {
  keyboards: Keyboard[];
  total: number;
}

/**
 * Keyboard persistence operations using MongoDB/Mongoose.
 */
export class KeyboardRepository {
  constructor(private readonly keyboardModel: Model<IKeyboardDocument>) {}

  /**
   * Creates a new keyboard in the database
   *
   * @param keyboard - Keyboard entity to create
   * @returns Created keyboard with generated ID
   */
  async create(keyboard: Keyboard): Promise<Keyboard> {
    const document = this.entityToDocument(keyboard);
    const savedDoc = await this.keyboardModel.create(document);
    return this.documentToEntity(savedDoc);
  }

  /**
   * Updates an existing keyboard
   *
   * @param id - Keyboard ID
   * @param keyboard - Updated keyboard entity
   * @returns Updated keyboard entity
   * @throws Error if keyboard not found
   */
  async update(id: string, keyboard: Keyboard): Promise<Keyboard> {
    const document = this.entityToDocument(keyboard);

    // Remove _id from document to avoid conflicts
    const { _id, ...updateData } = document as any;

    const updatedDoc = await this.keyboardModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (!updatedDoc) {
      throw new Error(`Keyboard with id ${id} not found`);
    }

    return this.documentToEntity(updatedDoc);
  }

  /**
   * Deletes a keyboard by ID
   *
   * @param id - Keyboard ID to delete
   * @throws Error if keyboard not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.keyboardModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new Error(`Keyboard with id ${id} not found`);
    }
  }

  /**
   * Finds a keyboard by ID
   *
   * @param id - Keyboard ID
   * @returns Keyboard entity or null if not found
   */
  async findById(id: string): Promise<Keyboard | null> {
    const doc = await this.keyboardModel.findById(id).exec();

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Finds all keyboards with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, isBroadcast, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing keyboards array and total count
   */
  async findAll(
    filters?: KeyboardFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult> {
    const query = this.buildQuery(filters);

    // Get total count
    const total = await this.keyboardModel.countDocuments(query).exec();

    // Build query with pagination
    let mongooseQuery = this.keyboardModel.find(query);

    // Apply pagination
    if (pagination && pagination.page && pagination.limit) {
      const skip = (pagination.page - 1) * pagination.limit;
      mongooseQuery = mongooseQuery.skip(skip).limit(pagination.limit);
    }

    // Apply sorting (default: createdAt descending)
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

    const docs = await mongooseQuery.exec();

    const keyboards = docs.map((doc) => this.documentToEntity(doc));

    return {
      keyboards,
      total,
    };
  }

  /**
   * Checks if a keyboard exists by ID
   *
   * @param id - Keyboard ID to check
   * @returns True if keyboard exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.keyboardModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  /**
   * Converts MongoDB document to Keyboard domain entity
   *
   * @param doc - MongoDB document
   * @returns Keyboard domain entity
   */
  private documentToEntity(doc: IKeyboardDocument): Keyboard {
    return Keyboard.fromDatabaseDocument({
      _id: doc._id,
      type: doc.Type,
      Buttons: doc.Buttons.map((buttonDoc) =>
        Button.fromDatabaseDocument(buttonDoc)
      ),
      DefaultHeight: doc.DefaultHeight,
      InputFieldState: doc.InputFieldState,
      BgColor: doc.BgColor,
      hidden: doc.hidden,
      humanReadableName: doc.humanReadableName,
      title: doc.title,
      isBroadcast: doc.isBroadcast,
      isTemplate: doc.isTemplate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Converts Keyboard domain entity to MongoDB document format
   *
   * @param keyboard - Keyboard domain entity
   * @returns MongoDB document object
   */
  private entityToDocument(keyboard: Keyboard): Partial<IKeyboardDocument> {
    return {
      Type: keyboard.type,
      Buttons: keyboard.Buttons.map((button) => ({
        Columns: button.Columns,
        Rows: button.Rows,
        Text: button.Text,
        TextColor: button.TextColor,
        BgColor: button.BgColor,
        BgMedia: button.BgMedia,
        BgMediaType: button.BgMediaType,
        BgMediaScaleType: button.BgMediaScaleType,
        BgLoop: button.BgLoop,
        ActionType: button.ActionType,
        ActionBody: button.ActionBody,
        OpenURLType: button.OpenURLType,
        InternalBrowser: button.InternalBrowser
          ? {
              Mode: button.InternalBrowser.Mode,
            }
          : undefined,
        TextVAlign: button.TextVAlign,
        TextHAlign: button.TextHAlign,
        TextSize: button.TextSize,
        Silent: button.Silent,
        isJson: button.isJson,
        createdAt: new Date(button.createdAt),
        updatedAt: new Date(button.updatedAt),
      })),
      DefaultHeight: keyboard.DefaultHeight,
      InputFieldState: keyboard.InputFieldState,
      BgColor: keyboard.BgColor,
      hidden: keyboard.hidden,
      humanReadableName: keyboard.humanReadableName,
      title: keyboard.title,
      isBroadcast: keyboard.isBroadcast,
      isTemplate: keyboard.isTemplate,
      createdAt: new Date(keyboard.createdAt),
      updatedAt: new Date(keyboard.updatedAt),
    };
  }

  /**
   * Builds Mongoose query from filters
   *
   * @param filters - Filter options
   * @returns Mongoose query object
   */
  private buildQuery(filters?: KeyboardFilters): any {
    const query: any = {};

    if (filters) {
      if (filters.hidden !== undefined) {
        query.hidden = filters.hidden;
      }

      if (filters.isBroadcast !== undefined) {
        query.isBroadcast = filters.isBroadcast;
      }

      if (filters.isTemplate !== undefined) {
        query.isTemplate = filters.isTemplate;
      }

      if (filters.search) {
        // Search in humanReadableName and title
        query.$or = [
          { humanReadableName: { $regex: filters.search, $options: "i" } },
          { title: { $regex: filters.search, $options: "i" } },
        ];
      }
    }

    return query;
  }
}
