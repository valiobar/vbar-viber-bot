import { AITaskType } from "../value-objects/AITaskType";

/**
 * Prompt Template domain entity
 * Represents a prompt template for AI processing
 */
export class PromptTemplate {
  public readonly name: string;
  public readonly template: string;
  public readonly variables: string[];
  public readonly taskType: AITaskType;
  public readonly description?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(
    name: string,
    template: string,
    taskType: AITaskType,
    variables: string[] = [],
    description?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    // Validate required fields
    if (!name || name.trim().length === 0) {
      throw new Error("Template name is required");
    }
    if (!template || template.trim().length === 0) {
      throw new Error("Template content is required");
    }
    if (!taskType) {
      throw new Error("Task type is required");
    }

    this.name = name.trim();
    this.template = template.trim();
    this.taskType = taskType;
    this.variables =
      variables.length > 0 ? variables : this.extractVariables(template);
    this.description = description;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Render the template with provided variables
   * @param variables - Object containing variable values
   * @returns Rendered template string
   * @throws Error if required variables are missing
   */
  public render(variables: Record<string, string>): string {
    this.validateVariables(variables);

    let rendered = this.template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      rendered = rendered.replace(new RegExp(placeholder, "g"), value);
    }

    return rendered;
  }

  /**
   * Validate that all required variables are provided
   * @param variables - Object containing variable values
   * @returns true if all required variables are provided
   * @throws Error if any required variables are missing
   */
  public validateVariables(variables: Record<string, string>): boolean {
    const missing: string[] = [];

    for (const variable of this.variables) {
      if (!(variable in variables) || !variables[variable]?.trim()) {
        missing.push(variable);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required template variables: ${missing.join(", ")}`
      );
    }

    return true;
  }

  /**
   * Extract variable names from template string
   * @param templateString - Template string to extract variables from
   * @returns Array of variable names found in template
   */
  private extractVariables(templateString: string): string[] {
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

