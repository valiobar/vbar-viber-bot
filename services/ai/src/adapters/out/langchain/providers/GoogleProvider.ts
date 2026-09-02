/**
 * Google Provider Adapter
 *
 * LangChain adapter implementation for Google Generative AI chat models.
 * Extends LangChainAdapter to provide Google-specific chat model creation.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LangChainAdapter } from "../LangChainAdapter";
import { AIProvider } from "../../../../domains/ai/value-objects";
import { AIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * Google provider adapter implementation
 *
 * Creates and manages Google Generative AI chat models using LangChain.
 */
export class GoogleProvider extends LangChainAdapter {
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
   * Create the Google Generative AI chat model instance
   *
   * @returns BaseChatModel instance configured for Google
   * @throws Error if Google configuration is missing
   */
  protected createChatModel(): BaseChatModel {
    if (!this.config.google) {
      throw new Error(
        "Google configuration is required but not provided in AIConfig"
      );
    }

    const { apiKey, model } = this.config.google;

    this.logger.info("Creating Google Generative AI chat model", {
      model,
    });

    return new ChatGoogleGenerativeAI({
      apiKey,
      model,
      temperature: this.config.temperature,
      maxOutputTokens: this.config.maxTokens,
    });
  }

  /**
   * Get the provider type
   *
   * @returns AIProvider.GOOGLE
   */
  public getProviderType(): AIProvider {
    return AIProvider.GOOGLE;
  }
}




