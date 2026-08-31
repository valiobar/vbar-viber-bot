/**
 * Ollama Provider Adapter
 *
 * LangChain adapter implementation for Ollama chat models.
 * Extends LangChainAdapter to provide Ollama-specific chat model creation.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { LangChainAdapter } from "../LangChainAdapter";
import { AIProvider } from "../../../../domains/ai/value-objects";
import { AIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * Ollama provider adapter implementation
 *
 * Creates and manages Ollama chat models using LangChain.
 */
export class OllamaProvider extends LangChainAdapter {
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
   * Create the Ollama chat model instance
   *
   * @returns BaseChatModel instance configured for Ollama
   * @throws Error if Ollama configuration is missing
   */
  protected createChatModel(): BaseChatModel {
    if (!this.config.ollama) {
      throw new Error(
        "Ollama configuration is required but not provided in AIConfig"
      );
    }

    const { baseUrl, model } = this.config.ollama;

    this.logger.info("Creating Ollama chat model", {
      model,
      baseUrl,
    });

    return new ChatOllama({
      baseUrl,
      model,
      temperature: this.config.temperature,
      
    });
  }

  /**
   * Get the provider type
   *
   * @returns AIProvider.OLLAMA
   */
  public getProviderType(): AIProvider {
    return AIProvider.OLLAMA;
  }
}
