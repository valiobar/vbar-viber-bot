/**
 * Anthropic Provider Adapter
 *
 * LangChain adapter implementation for Anthropic chat models.
 * Extends LangChainAdapter to provide Anthropic-specific chat model creation.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatAnthropic } from "@langchain/anthropic";
import { LangChainAdapter } from "../LangChainAdapter";
import { AIProvider } from "../../../../domains/ai/value-objects";
import { AIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * Anthropic provider adapter implementation
 *
 * Creates and manages Anthropic chat models using LangChain.
 */
export class AnthropicProvider extends LangChainAdapter {
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
   * Create the Anthropic chat model instance
   *
   * @returns BaseChatModel instance configured for Anthropic
   * @throws Error if Anthropic configuration is missing
   */
  protected createChatModel(): BaseChatModel {
    if (!this.config.anthropic) {
      throw new Error(
        "Anthropic configuration is required but not provided in AIConfig"
      );
    }

    const { apiKey, model } = this.config.anthropic;

    this.logger.info("Creating Anthropic chat model", {
      model,
    });

    return new ChatAnthropic({
      anthropicApiKey: apiKey,
      modelName: model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Get the provider type
   *
   * @returns AIProvider.ANTHROPIC
   */
  public getProviderType(): AIProvider {
    return AIProvider.ANTHROPIC;
  }
}




