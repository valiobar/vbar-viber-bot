/**
 * Prompt Template Service
 *
 * Domain service for prompt template operations.
 * Provides template rendering and variable extraction functionality.
 */

import { PromptTemplate } from "../entities";

/**
 * Prompt Template Service
 *
 * Provides static utility methods for working with prompt templates.
 */
export class PromptTemplateService {
  /**
   * Render a template with provided variables
   *
   * Validates that all required variables are provided and renders
   * the template string with variable substitution.
   *
   * @param template - The prompt template to render
   * @param variables - Object containing variable values
   * @returns Rendered prompt string
   * @throws Error if required variables are missing
   */
  static renderTemplate(
    template: PromptTemplate,
    variables: Record<string, string>
  ): string {
    // Validate all required variables are provided
    template.validateVariables(variables);

    // Render template string with variable substitution
    return template.render(variables);
  }

  /**
   * Extract variable names from template string
   *
   * Extracts variable names from template string using pattern matching.
   * Variables are expected to be in the format {variableName}.
   *
   * @param templateString - Template string to extract variables from
   * @returns Array of variable names found in template
   */
  static extractVariables(templateString: string): string[] {
    const variableRegex = /\{(\w+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(templateString)) !== null) {
      const variableName = match[1];
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }

    return variables;
  }
}


