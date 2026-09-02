/**
 * AI Provider Factory
 *
 * Factory for creating appropriate AI provider instances based on configuration.
 * Implements the factory pattern to abstract provider creation logic.
 */

import { OpenAIProvider } from "../providers/OpenAIProvider";
import { OllamaProvider } from "../providers/OllamaProvider";
import { AnthropicProvider } from "../providers/AnthropicProvider";
import { GoogleProvider } from "../providers/GoogleProvider";
import { AIProviderPort } from "../../../../ports/out/AIProviderPort";
import { AIConfig, getAIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";
import { AIProvider } from "../../../../domains/ai/value-objects";

/**
 * Create an AI provider instance based on configuration
 *
 * Reads AI configuration and creates the appropriate provider instance
 * (OpenAI, Ollama, Anthropic, or Google) based on the configured provider.
 *
 * @param logger - Logger instance for logging
 * @returns AIProviderPort instance for the configured provider
 * @throws Error if the configured provider is not supported or configuration is invalid
 */
export function createAIProvider(logger: Logger): AIProviderPort {
  const config = getAIConfig();

  logger.info("Creating AI provider", {
    provider: config.provider,
  });

  switch (config.provider) {
    case AIProvider.OPENAI:
      return new OpenAIProvider(config, logger);

    case AIProvider.OLLAMA:
      return new OllamaProvider(config, logger);

    case AIProvider.ANTHROPIC:
      return new AnthropicProvider(config, logger);

    case AIProvider.GOOGLE:
      return new GoogleProvider(config, logger);

    default:
      throw new Error(
        `Unsupported AI provider: ${
          config.provider
        }. Supported providers: ${Object.values(AIProvider).join(", ")}`
      );
  }
}
