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
      doc.updatedAt ? new Date(doc.updatedAt) : new Date()
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
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}



