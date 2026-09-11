/**
 * MongoDB Prompt Template Repository Adapter
 *
 * Implements PromptTemplateRepository port using MongoDB.
 * Stores and retrieves prompt templates from MongoDB collection.
 */

import { PromptTemplateRepository } from "../../../ports/out/PromptTemplateRepository";
import { PromptTemplate } from "../../../domains/ai/entities";
import { AITaskType } from "../../../domains/ai/value-objects";
import { getMongoDatabase } from "@vbar/shared/infra";
import { Logger, ConfigHelper } from "@vbar/shared";

/**
 * MongoDB Prompt Template Repository implementation
 *
 * Uses MongoDB native driver to store and retrieve prompt templates.
 * Templates are stored in the "prompt_templates" collection.
 */
export class MongoPromptTemplateRepository implements PromptTemplateRepository {
  private readonly collectionName = "prompt_templates";
  private readonly logger: Logger;

  /**
   * Constructor
   *
   * @param logger - Logger instance for logging
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Get a template by name
   *
   * @param name - The name of the template
   * @returns Promise resolving to the template or null if not found
   */
  async getTemplate(name: string): Promise<PromptTemplate | null> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const doc = await collection.findOne({ name });

      if (!doc) {
        return null;
      }

      return this.documentToEntity(doc);
    } catch (error) {
      this.logger.error(`Failed to get template "${name}":`, error as Error);
      throw new Error(
        `Failed to get template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get the default template
   *
   * @returns Promise resolving to the default template or null if not found
   */
  async getDefaultTemplate(): Promise<PromptTemplate | null> {
    try {
      // Get default template name from config or use "default"
      const defaultTemplateName = ConfigHelper.getEnv(
        "PROMPT_TEMPLATE_DEFAULT",
        "default"
      );

      return await this.getTemplate(defaultTemplateName);
    } catch (error) {
      this.logger.error("Failed to get default template:", error as Error);
      throw new Error(
        `Failed to get default template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Save or update a template
   *
   * @param template - The template to save or update
   * @returns Promise that resolves when the template is saved
   */
  async saveTemplate(template: PromptTemplate): Promise<void> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const doc = this.entityToDocument(template);

      await collection.updateOne(
        { name: template.name },
        { $set: doc },
        { upsert: true }
      );

      this.logger.info(`Saved template "${template.name}"`);
    } catch (error) {
      this.logger.error(
        `Failed to save template "${template.name}":`,
        error as Error
      );
      throw new Error(
        `Failed to save template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List all templates, optionally filtered by task type
   *
   * @param taskType - Optional task type to filter templates
   * @returns Promise resolving to array of templates
   */
  async listTemplates(taskType?: AITaskType): Promise<PromptTemplate[]> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const query = taskType ? { taskType: taskType } : {};

      const docs = await collection.find(query).toArray();

      return docs.map((doc) => this.documentToEntity(doc));
    } catch (error) {
      this.logger.error("Failed to list templates:", error as Error);
      throw new Error(
        `Failed to list templates: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete a template by name
   *
   * @param name - The name of the template to delete
   * @returns Promise that resolves when the template is deleted
   */
  async deleteTemplate(name: string): Promise<void> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const result = await collection.deleteOne({ name });

      if (result.deletedCount === 0) {
        throw new Error(`Template "${name}" not found`);
      }

      this.logger.info(`Deleted template "${name}"`);
    } catch (error) {
      this.logger.error(`Failed to delete template "${name}":`, error as Error);
      throw new Error(
        `Failed to delete template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Active prompt for a chain type, or null when none is active.
   *
   * @param taskType - The chain type to look up
   * @returns Promise resolving to the active template or null
   */
  async getActiveTemplate(taskType: AITaskType): Promise<PromptTemplate | null> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const doc = await db
        .collection(this.collectionName)
        .findOne({ taskType, isActive: true });

      return doc ? this.documentToEntity(doc) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get active template for "${taskType}":`,
        error as Error
      );
      throw new Error(
        `Failed to get active template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clear isActive on every template of a task type except `exceptName`.
   *
   * @param taskType - The chain type to deactivate
   * @param exceptName - Optional template name to leave unchanged
   */
  async deactivateAll(taskType: AITaskType, exceptName?: string): Promise<void> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const filter: Record<string, unknown> = { taskType, isActive: true };
      if (exceptName) {
        filter.name = { $ne: exceptName };
      }

      await db.collection(this.collectionName).updateMany(filter, {
        $set: { isActive: false },
      });
    } catch (error) {
      this.logger.error(
        `Failed to deactivate templates for "${taskType}":`,
        error as Error
      );
      throw new Error(
        `Failed to deactivate templates: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Create the unique name index and the { taskType, isActive } index.
   */
  async ensureIndexes(): Promise<void> {
    try {
      const db = await getMongoDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      await collection.createIndex({ name: 1 }, { unique: true });
      await collection.createIndex({ taskType: 1, isActive: 1 });
    } catch (error) {
      this.logger.error("Failed to ensure prompt template indexes:", error as Error);
      throw new Error(
        `Failed to ensure indexes: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Convert MongoDB document to PromptTemplate entity
   *
   * @param doc - MongoDB document
   * @returns PromptTemplate entity
   */
  private documentToEntity(doc: any): PromptTemplate {
    return new PromptTemplate(
      doc.name,
      doc.template,
      doc.taskType as AITaskType,
      doc.variables || [],
      doc.description,
      doc.createdAt ? new Date(doc.createdAt) : new Date(),
      doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      doc.isActive === true
    );
  }

  /**
   * Convert PromptTemplate entity to MongoDB document
   *
   * @param template - PromptTemplate entity
   * @returns MongoDB document
   */
  private entityToDocument(template: PromptTemplate): any {
    return {
      name: template.name,
      template: template.template,
      taskType: template.taskType,
      variables: template.variables,
      description: template.description,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}



