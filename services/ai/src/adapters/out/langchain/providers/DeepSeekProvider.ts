/**
 * DeepSeek Provider Adapter
 *
 * LangChain adapter implementation for DeepSeek chat models.
 * DeepSeek's API is OpenAI-compatible, so ChatOpenAI is reused with a
 * custom baseURL (https://api.deepseek.com).
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { LangChainAdapter } from "../LangChainAdapter";
import { AIProvider } from "../../../../domains/ai/value-objects";
import { AIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * DeepSeek provider adapter implementation
 *
 * Creates and manages DeepSeek chat models using LangChain's ChatOpenAI
 * pointed at the DeepSeek OpenAI-compatible API.
 */
export class DeepSeekProvider extends LangChainAdapter {
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
   * Create the DeepSeek chat model instance
   *
   * @returns BaseChatModel instance configured for DeepSeek
   * @throws Error if DeepSeek configuration is missing
   */
  protected createChatModel(): BaseChatModel {
    if (!this.config.deepseek) {
      throw new Error(
        "DeepSeek configuration is required but not provided in AIConfig"
      );
    }

    const { apiKey, model, baseUrl } = this.config.deepseek;

    this.logger.info("Creating DeepSeek chat model", {
      model,
      baseUrl,
    });

    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      configuration: {
        baseURL: baseUrl,
      },
    }) as BaseChatModel;
  }

  /**
   * Get the provider type
   *
   * @returns AIProvider.DEEPSEEK
   */
  public getProviderType(): AIProvider {
    return AIProvider.DEEPSEEK;
  }
}
