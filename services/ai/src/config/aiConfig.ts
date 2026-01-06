/**
 * AI Configuration Module
 *
 * Provides configuration for AI model providers, RAG, prompt templates, and LangSmith tracing.
 * Reads configuration from environment variables with sensible defaults.
 */

import { ConfigHelper } from "@vbar/shared";
import { AIProvider, parseAIProvider } from "../domains/ai/value-objects";

/**
 * Provider-specific configuration interfaces
 */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
}

export interface GoogleConfig {
  apiKey: string;
  model: string;
}

/**
 * RAG (Retrieval Augmented Generation) configuration
 */
export interface RAGConfig {
  enabled: boolean;
  embeddingProvider: "openai" | "ollama" | "local";
  openaiEmbeddingModel: string;
  ollamaEmbeddingModel: string;
  vectorStoreType: "mongodb" | "memory";
  vectorStoreCollection: string;
  retrieverK: number;
  similarityThreshold: number;
}

/**
 * Prompt template configuration
 */
export interface PromptTemplateConfig {
  enabled: boolean;
  storage: "mongodb" | "file";
  default?: string;
}

/**
 * Main AI configuration interface
 */
export interface AIConfig {
  provider: AIProvider;
  temperature: number;
  maxTokens?: number;
  conversationMemoryType: "buffer" | "summary";
  conversationMaxHistory: number;
  openai?: OpenAIConfig;
  ollama?: OllamaConfig;
  anthropic?: AnthropicConfig;
  google?: GoogleConfig;
  rag: RAGConfig;
  promptTemplates: PromptTemplateConfig;
}

/**
 * Get AI configuration from environment variables
 *
 * Reads and validates all AI-related environment variables, providing
 * sensible defaults where appropriate.
 *
 * @returns AIConfig object with all configuration values
 * @throws Error if required configuration is missing or invalid
 */
export function getAIConfig(): AIConfig {
  // Get provider
  const providerStr = ConfigHelper.getEnv("AI_MODEL_PROVIDER", "openai");
  const provider = parseAIProvider(providerStr);

  // Get general AI settings
  const temperature = ConfigHelper.getEnvNumber("AI_TEMPERATURE", 0.7);
  const maxTokens = ConfigHelper.getEnv("AI_MAX_TOKENS")
    ? ConfigHelper.getEnvNumber("AI_MAX_TOKENS")
    : undefined;
  const conversationMemoryType = (ConfigHelper.getEnv(
    "CONVERSATION_MEMORY_TYPE",
    "buffer"
  ) || "buffer") as "buffer" | "summary";
  const conversationMaxHistory = ConfigHelper.getEnvNumber(
    "CONVERSATION_MAX_HISTORY",
    10
  );

  // Validate conversation memory type
  if (
    conversationMemoryType !== "buffer" &&
    conversationMemoryType !== "summary"
  ) {
    throw new Error(
      `Invalid CONVERSATION_MEMORY_TYPE: ${conversationMemoryType}. Must be "buffer" or "summary"`
    );
  }

  // Provider-specific configurations
  let openai: OpenAIConfig | undefined;
  let ollama: OllamaConfig | undefined;
  let anthropic: AnthropicConfig | undefined;
  let google: GoogleConfig | undefined;

  // OpenAI configuration
  if (provider === AIProvider.OPENAI) {
    const apiKey = ConfigHelper.getEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when using OpenAI provider");
    }
    openai = {
      apiKey,
      model: ConfigHelper.getEnv("OPENAI_MODEL", "gpt-3.5-turbo"),
    };
  }

  // Ollama configuration
  if (provider === AIProvider.OLLAMA) {
    ollama = {
      baseUrl: ConfigHelper.getEnv("OLLAMA_BASE_URL", "http://localhost:11434"),
      model: ConfigHelper.getEnv("OLLAMA_MODEL", "llama2"),
    };
  }

  // Anthropic configuration
  if (provider === AIProvider.ANTHROPIC) {
    const apiKey = ConfigHelper.getEnv("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required when using Anthropic provider"
      );
    }
    const model = ConfigHelper.getEnv("ANTHROPIC_MODEL");
    if (!model) {
      throw new Error(
        "ANTHROPIC_MODEL is required when using Anthropic provider"
      );
    }
    anthropic = {
      apiKey,
      model,
    };
  }

  // Google configuration
  if (provider === AIProvider.GOOGLE) {
    const apiKey = ConfigHelper.getEnv("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_API_KEY is required when using Google provider"
      );
    }
    google = {
      apiKey,
      model: ConfigHelper.getEnv("GOOGLE_AI_MODEL", "gemini-pro"),
    };
  }

  // RAG configuration
  const ragEnabled = ConfigHelper.getEnvBoolean("RAG_ENABLED", false);
  const ragConfig: RAGConfig = {
    enabled: ragEnabled,
    embeddingProvider: (ConfigHelper.getEnv(
      "RAG_EMBEDDING_PROVIDER",
      "openai"
    ) || "openai") as "openai" | "ollama" | "local",
    openaiEmbeddingModel: ConfigHelper.getEnv(
      "RAG_OPENAI_EMBEDDING_MODEL",
      "text-embedding-3-small"
    ),
    ollamaEmbeddingModel: ConfigHelper.getEnv(
      "RAG_OLLAMA_EMBEDDING_MODEL",
      "nomic-embed-text"
    ),
    vectorStoreType: (ConfigHelper.getEnv("RAG_VECTOR_STORE_TYPE", "mongodb") ||
      "mongodb") as "mongodb" | "memory",
    vectorStoreCollection: ConfigHelper.getEnv(
      "RAG_VECTOR_STORE_COLLECTION",
      "embeddings"
    ),
    retrieverK: ConfigHelper.getEnvNumber("RAG_RETRIEVER_K", 4),
    similarityThreshold: ConfigHelper.getEnvNumber(
      "RAG_SIMILARITY_THRESHOLD",
      0.7
    ),
  };

  // Validate RAG embedding provider
  if (
    ragConfig.embeddingProvider !== "openai" &&
    ragConfig.embeddingProvider !== "ollama" &&
    ragConfig.embeddingProvider !== "local"
  ) {
    throw new Error(
      `Invalid RAG_EMBEDDING_PROVIDER: ${ragConfig.embeddingProvider}. Must be "openai", "ollama", or "local"`
    );
  }

  // Validate RAG vector store type
  if (
    ragConfig.vectorStoreType !== "mongodb" &&
    ragConfig.vectorStoreType !== "memory"
  ) {
    throw new Error(
      `Invalid RAG_VECTOR_STORE_TYPE: ${ragConfig.vectorStoreType}. Must be "mongodb" or "memory"`
    );
  }

  // Prompt template configuration
  const promptTemplatesEnabled = ConfigHelper.getEnvBoolean(
    "PROMPT_TEMPLATES_ENABLED",
    true
  );
  const promptTemplateStorage = ConfigHelper.getEnv(
    "PROMPT_TEMPLATE_STORAGE",
    "mongodb"
  );

  // Validate prompt template storage
  if (promptTemplateStorage !== "mongodb" && promptTemplateStorage !== "file") {
    throw new Error(
      `Invalid PROMPT_TEMPLATE_STORAGE: ${promptTemplateStorage}. Must be "mongodb" or "file"`
    );
  }

  const promptTemplateConfig: PromptTemplateConfig = {
    enabled: promptTemplatesEnabled,
    storage: promptTemplateStorage as "mongodb" | "file",
    default: ConfigHelper.getEnv("PROMPT_TEMPLATE_DEFAULT") || undefined,
  };

  return {
    provider,
    temperature,
    maxTokens,
    conversationMemoryType,
    conversationMaxHistory,
    openai,
    ollama,
    anthropic,
    google,
    rag: ragConfig,
    promptTemplates: promptTemplateConfig,
  };
}
