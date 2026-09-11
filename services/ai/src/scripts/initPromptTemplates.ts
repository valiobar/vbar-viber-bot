/**
 * Initialize Prompt Templates
 *
 * Runs at startup:
 * 1. Ensures MongoDB indexes on prompt_templates
 * 2. Runs the existing Bulgarian culture seeder (isActive-preserving)
 * 3. Upserts the default RAG prompt when missing
 * 4. Activates a default per task type only when nothing is active yet
 */

import { ConsoleLogger } from "@vbar/shared";
import { MongoPromptTemplateRepository } from "../adapters/out/mongodb/PromptTemplateRepository";
import { PromptTemplate } from "../domains/ai/entities";
import { AITaskType } from "../domains/ai/value-objects";
import { initBulgarianCulturePrompt } from "./initBulgarianCulturePrompt";
import { BULGARIAN_CULTURE_TEMPLATE_NAME } from "./bulgarianCulturePromptTemplate";
import {
  DEFAULT_RAG_TEMPLATE_NAME,
  DEFAULT_RAG_PROMPT,
} from "./defaultRagPromptTemplate";

const logger = new ConsoleLogger("InitPromptTemplates");

export async function initPromptTemplates(): Promise<void> {
  const repository = new MongoPromptTemplateRepository(logger);

  logger.info("Ensuring prompt template indexes...");
  await repository.ensureIndexes();

  await initBulgarianCulturePrompt();

  if (!(await repository.getTemplate(DEFAULT_RAG_TEMPLATE_NAME))) {
    logger.info(`Seeding default RAG prompt "${DEFAULT_RAG_TEMPLATE_NAME}"...`);
    await repository.saveTemplate(
      new PromptTemplate(
        DEFAULT_RAG_TEMPLATE_NAME,
        DEFAULT_RAG_PROMPT,
        AITaskType.RAG,
        [],
        "Default RAG prompt (context + question)"
      )
    );
  }

  await activateWhenNoneActive(
    repository,
    AITaskType.SIMPLE,
    BULGARIAN_CULTURE_TEMPLATE_NAME
  );
  await activateWhenNoneActive(
    repository,
    AITaskType.RAG,
    DEFAULT_RAG_TEMPLATE_NAME
  );

  logger.info("Prompt templates initialized");
}

/**
 * Never overrides an operator's choice — only fills an empty slot.
 */
async function activateWhenNoneActive(
  repository: MongoPromptTemplateRepository,
  taskType: AITaskType,
  name: string
): Promise<void> {
  if (await repository.getActiveTemplate(taskType)) return;
  const template = await repository.getTemplate(name);
  if (!template) return;

  logger.info(`No active ${taskType} prompt — activating "${name}"`);
  await repository.saveTemplate(
    new PromptTemplate(
      template.name,
      template.template,
      template.taskType,
      template.variables,
      template.description,
      template.createdAt,
      new Date(),
      true
    )
  );
}
