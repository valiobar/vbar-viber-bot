import { Logger } from "@vbar/shared";
import {
  ManagePromptsUseCase,
  PromptDTO,
  CreatePromptInput,
  UpdatePromptInput,
  PromptTaskType,
} from "../../ports/in/ManagePromptsUseCase";
import { PromptTemplateRepository } from "../../ports/out/PromptTemplateRepository";
import { PromptTemplate } from "../../domains/ai/entities";
import { AITaskType, parseAITaskType } from "../../domains/ai/value-objects";
import { PromptTemplateService } from "../../domains/ai/services/PromptTemplateService";

const NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const RAG_VARIABLES = ["context", "question"];

export class ManagePromptsUseCaseImpl implements ManagePromptsUseCase {
  constructor(
    private readonly repository: PromptTemplateRepository,
    private readonly logger: Logger
  ) {}

  async list(taskType?: PromptTaskType): Promise<PromptDTO[]> {
    const templates = await this.repository.listTemplates(
      taskType ? parseAITaskType(taskType) : undefined
    );
    return templates
      .map((t) => this.toDTO(t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(name: string): Promise<PromptDTO> {
    const template = await this.repository.getTemplate(name);
    if (!template) throw new Error(`Prompt "${name}" not found`);
    return this.toDTO(template);
  }

  async create(input: CreatePromptInput): Promise<PromptDTO> {
    const name = (input.name ?? "").trim();
    if (!NAME_PATTERN.test(name)) {
      throw new Error(
        "Prompt name is required and must be 1-64 chars of letters, digits, _ or -"
      );
    }
    if (await this.repository.getTemplate(name)) {
      throw new Error(`Prompt "${name}" already exists`);
    }

    const taskType = parseAITaskType(input.taskType);
    this.assertTemplateShape(taskType, input.template);

    const template = new PromptTemplate(
      name,
      input.template,
      taskType,
      [], // variables auto-extracted by the entity
      input.description,
      undefined,
      undefined,
      input.isActive === true
    );

    if (template.isActive) {
      await this.repository.deactivateAll(taskType, name);
    }
    await this.repository.saveTemplate(template);
    this.logger.info("Prompt created", { name, taskType, isActive: template.isActive });
    return this.toDTO(template);
  }

  async update(name: string, input: UpdatePromptInput): Promise<PromptDTO> {
    const existing = await this.repository.getTemplate(name);
    if (!existing) throw new Error(`Prompt "${name}" not found`);

    const taskType = input.taskType ? parseAITaskType(input.taskType) : existing.taskType;
    const body = input.template ?? existing.template;
    this.assertTemplateShape(taskType, body);

    const isActive = input.isActive ?? existing.isActive;
    const updated = new PromptTemplate(
      existing.name, // immutable
      body,
      taskType,
      [],
      input.description ?? existing.description,
      existing.createdAt, // preserved
      new Date(),
      isActive
    );

    if (isActive) {
      await this.repository.deactivateAll(taskType, existing.name);
    }
    await this.repository.saveTemplate(updated);
    return this.toDTO(updated);
  }

  async delete(name: string): Promise<void> {
    await this.repository.deleteTemplate(name); // throws "not found" when missing
  }

  /**
   * simple → no {placeholders} (they would become LangChain input variables
   * in ChatPromptTemplate and throw at invoke time).
   * rag    → exactly {context} and {question}.
   * custom → free-form.
   */
  private assertTemplateShape(taskType: AITaskType, body: string): void {
    if (!body || body.trim().length === 0) {
      throw new Error("Prompt template content is required");
    }
    const variables = PromptTemplateService.extractVariables(body);

    if (taskType === AITaskType.SIMPLE && (variables.length > 0 || body.includes("{"))) {
      throw new Error(
        "A simple prompt must not contain { } placeholders — it is sent as a system message"
      );
    }
    if (taskType === AITaskType.RAG) {
      const missing = RAG_VARIABLES.filter((v) => !variables.includes(v));
      const extra = variables.filter((v) => !RAG_VARIABLES.includes(v));
      if (missing.length > 0) {
        const missingPlaceholders = missing.map((v) => `{${v}}`).join(" and ");
        throw new Error(`A rag prompt must include ${missingPlaceholders}`);
      }
      if (extra.length > 0) {
        throw new Error(
          `A rag prompt supports only {context} and {question}; invalid: ${extra.join(", ")}`
        );
      }
    }
  }

  private toDTO(template: PromptTemplate): PromptDTO {
    return {
      name: template.name,
      template: template.template,
      taskType: template.taskType as PromptTaskType,
      variables: template.variables,
      description: template.description,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}
