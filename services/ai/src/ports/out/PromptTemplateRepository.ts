import { PromptTemplate } from "../../domains/ai/entities";
import { AITaskType } from "../../domains/ai/value-objects";

/**
 * Port interface for prompt template storage and retrieval
 * This is an outbound port that defines the contract for managing prompt templates
 */
export interface PromptTemplateRepository {
  /**
   * Get a template by name
   * @param name - The name of the template
   * @returns Promise resolving to the template or null if not found
   */
  getTemplate(name: string): Promise<PromptTemplate | null>;

  /**
   * Get the default template
   * @returns Promise resolving to the default template or null if not found
   */
  getDefaultTemplate(): Promise<PromptTemplate | null>;

  /**
   * Save or update a template
   * @param template - The template to save or update
   * @returns Promise that resolves when the template is saved
   */
  saveTemplate(template: PromptTemplate): Promise<void>;

  /**
   * List all templates, optionally filtered by task type
   * @param taskType - Optional task type to filter templates
   * @returns Promise resolving to array of templates
   */
  listTemplates(taskType?: AITaskType): Promise<PromptTemplate[]>;

  /**
   * Delete a template by name
   * @param name - The name of the template to delete
   * @returns Promise that resolves when the template is deleted
   */
  deleteTemplate(name: string): Promise<void>;
}




