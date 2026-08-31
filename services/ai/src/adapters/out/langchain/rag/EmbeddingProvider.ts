/**
 * Embedding Provider for RAG
 *
 * Creates embedding instances for vector store operations.
 * Supports OpenAI and Ollama embedding providers.
 *
 * Note: TypeScript errors for @langchain/openai and @langchain/ollama imports
 * will be resolved when packages are installed via `npm install`.
 */

import { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { AIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";
import { ConfigHelper } from "@vbar/shared";

/**
 * Embedding Provider class
 *
 * Creates appropriate embedding instances based on configuration.
 */
export class EmbeddingProvider {
  private config: AIConfig;
  private logger: Logger;

  /**
   * Constructor
   *
   * @param config - AI configuration object
   * @param logger - Logger instance for logging
   */
  constructor(config: AIConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Create embeddings instance based on configuration
   *
   * @returns Embeddings instance (OpenAI or Ollama)
   * @throws Error if embedding provider is not supported
   */
  createEmbeddings(): Embeddings {
    const provider = this.config.rag.embeddingProvider;

    switch (provider) {
      case "openai": {
        const apiKey = ConfigHelper.getEnv("OPENAI_API_KEY");
        if (!apiKey) {
          throw new Error(
            "OPENAI_API_KEY is required when using OpenAI embeddings"
          );
        }

        this.logger.info(
          `Creating OpenAI embeddings with model: ${this.config.rag.openaiEmbeddingModel}`
        );

        return new OpenAIEmbeddings({
          openAIApiKey: apiKey,
          modelName: this.config.rag.openaiEmbeddingModel,
        });
      }

      case "ollama": {
        const baseUrl = ConfigHelper.getEnv(
          "OLLAMA_BASE_URL",
          "http://localhost:11434"
        );

        this.logger.info(
          `Creating Ollama embeddings with model: ${this.config.rag.ollamaEmbeddingModel} at ${baseUrl}`
        );

        return new OllamaEmbeddings({
          baseUrl,
          model: this.config.rag.ollamaEmbeddingModel,
        });
      }

      case "local": {
        // Local embeddings not yet implemented
        // This would require a local embedding model
        throw new Error(
          "Local embeddings are not yet implemented. Please use 'openai' or 'ollama'."
        );
      }

      default:
        throw new Error(
          `Unsupported embedding provider: ${provider}. Must be 'openai', 'ollama', or 'local'.`
        );
    }
  }
}
