/**
 * OpenAI Provider Adapter
 *
 * LangChain adapter implementation for OpenAI chat models.
 * Extends LangChainAdapter to provide OpenAI-specific chat model creation.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { LangChainAdapter } from "../LangChainAdapter";
import { AIProvider } from "../../../../domains/ai/value-objects";
import { AIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * OpenAI provider adapter implementation
 *
 * Creates and manages OpenAI chat models using LangChain.
 */
export class OpenAIProvider extends LangChainAdapter {
  /**
   * Constructor
   *
   * @param config - AI configuration object
   * @param logger - Logger instance for logging
   */
  constructor(config: AIConfig, logger: Logger) {
    super(config, logger);
  }

  /**
   * Create the OpenAI chat model instance
   *
   * @returns BaseChatModel instance configured for OpenAI
   * @throws Error if OpenAI configuration is missing
   */
  protected createChatModel(): BaseChatModel {
    if (!this.config.openai) {
      throw new Error(
        "OpenAI configuration is required but not provided in AIConfig"
      );
    }

    const { apiKey, model } = this.config.openai;

    this.logger.info("Creating OpenAI chat model", {
      model,
    });

    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Get the provider type
   *
   * @returns AIProvider.OPENAI
   */
  public getProviderType(): AIProvider {
    return AIProvider.OPENAI;
  }
}



