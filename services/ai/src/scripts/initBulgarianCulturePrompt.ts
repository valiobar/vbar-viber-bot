/**
 * Initialize Bulgarian Culture Prompt Template
 *
 * Creates or updates the Bulgarian culture prompt template in MongoDB.
 * This script is idempotent and can be run multiple times safely.
 */

import { PromptTemplate } from "../domains/ai/entities";
import { AITaskType } from "../domains/ai/value-objects/AITaskType";
import { ConsoleLogger } from "@vbar/shared";
import { MongoPromptTemplateRepository } from "../adapters/out/mongodb/PromptTemplateRepository";
import {
  BULGARIAN_CULTURE_BASE_PROMPT,
  BULGARIAN_CULTURE_TEMPLATE_NAME,
} from "./bulgarianCulturePromptTemplate";

const logger = new ConsoleLogger("InitBulgarianCulturePrompt");

export async function initBulgarianCulturePrompt(): Promise<void> {
  try {
    logger.info("Initializing Bulgarian culture prompt template...");

    const repository = new MongoPromptTemplateRepository(logger);

    // Check if template already exists
    const existingTemplate = await repository.getTemplate(
      BULGARIAN_CULTURE_TEMPLATE_NAME
    );

    if (existingTemplate) {
      logger.info(
        `Template "${BULGARIAN_CULTURE_TEMPLATE_NAME}" already exists, updating...`
      );
    }

    // Create base template (used for all messages)
    const baseTemplate = new PromptTemplate(
      BULGARIAN_CULTURE_TEMPLATE_NAME,
      BULGARIAN_CULTURE_BASE_PROMPT,
      AITaskType.SIMPLE,
      [], // No variables
      "System prompt for Bulgarian culture context in AI responses"
    );

    await repository.saveTemplate(baseTemplate);

    logger.info(
      `Bulgarian culture prompt template "${BULGARIAN_CULTURE_TEMPLATE_NAME}" initialized successfully`
    );
  } catch (error) {
    logger.error("Failed to initialize Bulgarian culture prompt template", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Allow script to be run standalone
if (require.main === module) {
  initBulgarianCulturePrompt()
    .then(() => {
      logger.info("Initialization complete");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Initialization failed", error);
      process.exit(1);
    });
}
