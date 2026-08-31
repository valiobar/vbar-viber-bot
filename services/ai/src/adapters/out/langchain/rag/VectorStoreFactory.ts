/**
 * Vector Store Factory
 *
 * Creates appropriate vector store instances based on configuration.
 * Returns null if RAG is disabled.
 */

import { VectorStorePort } from "../../../../ports/out/VectorStorePort";
import { EmbeddingProvider } from "./EmbeddingProvider";
import { MongoVectorStore } from "./MongoVectorStore";
import { MemoryVectorStoreAdapter } from "./MemoryVectorStore";
import { AIConfig, getAIConfig } from "../../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * Create vector store instance based on configuration
 *
 * @param logger - Logger instance for logging
 * @returns VectorStorePort instance or null if RAG is disabled
 * @throws Error if vector store type is not supported or configuration is invalid
 */
export function createVectorStore(
  logger: Logger
): VectorStorePort | null {
  const config = getAIConfig();

  // Return null if RAG is disabled
  if (!config.rag.enabled) {
    logger.info("RAG is disabled, vector store not created");
    return null;
  }

  // Create embedding provider
  const embeddingProvider = new EmbeddingProvider(config, logger);
  const embeddings = embeddingProvider.createEmbeddings();

  // Create vector store based on type
  const vectorStoreType = config.rag.vectorStoreType;

  switch (vectorStoreType) {
    case "mongodb": {
      logger.info(
        `Creating MongoDB vector store with collection: ${config.rag.vectorStoreCollection}`
      );

      return new MongoVectorStore(
        embeddings,
        config.rag.vectorStoreCollection,
        logger
      );
    }

    case "memory": {
      logger.info("Creating in-memory vector store");

      return new MemoryVectorStoreAdapter(embeddings, logger);
    }

    default:
      throw new Error(
        `Unsupported vector store type: ${vectorStoreType}. Must be 'mongodb' or 'memory'.`
      );
  }
}

