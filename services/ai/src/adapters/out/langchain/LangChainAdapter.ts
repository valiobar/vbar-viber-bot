/**
 * LangChain Adapter Base Class
 *
 * Abstract base class for LangChain-based AI provider implementations.
 * Provides common functionality for memory management, prompt formatting, and response generation.
 * LangSmith tracing is automatically enabled when environment variables are set.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BufferMemory, ConversationSummaryMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { AIProviderPort } from "../../../ports/out/AIProviderPort";
import { AIProvider } from "../../../domains/ai/value-objects";
import { ConversationContext } from "../../../domains/ai/entities";
import { AIConfig } from "../../../config/aiConfig";
import { Logger } from "@vbar/shared";

/**
 * Abstract base class for LangChain-based AI provider adapters
 *
 * Implements the AIProviderPort interface and provides common functionality
 * for all LangChain-based providers (OpenAI, Ollama, Anthropic, Google).
 *
 * Features:
 * - Automatic LangSmith tracing (when enabled via environment variables)
 * - Conversation memory management (buffer or summary)
 * - Message formatting for LangChain chat models
 * - Error handling and logging
 */
export abstract class LangChainAdapter implements AIProviderPort {
  protected chatModel: BaseChatModel;
  protected memory: BufferMemory | ConversationSummaryMemory;
  protected logger: Logger;
  protected config: AIConfig;

  /**
   * Constructor
   *
   * @param config - AI configuration object
   * @param logger - Logger instance for logging
   */
  constructor(config: AIConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Create chat model (implemented by subclasses)
    this.chatModel = this.createChatModel();

    // Initialize memory based on configuration
    this.memory = this.initializeMemory();

    this.logger.info("LangChain adapter initialized", {
      provider: this.getProviderType(),
      memoryType: config.conversationMemoryType,
    });
  }

  /**
   * Create the chat model instance
   *
   * Must be implemented by subclasses to create provider-specific chat models.
   *
   * @returns BaseChatModel instance for the specific provider
   */
  protected abstract createChatModel(): BaseChatModel;

  /**
   * Get the provider type
   *
   * Must be implemented by subclasses to return their specific provider type.
   *
   * @returns AIProvider enum value
   */
  public abstract getProviderType(): AIProvider;

  /**
   * Initialize conversation memory based on configuration
   *
   * Creates either BufferMemory or ConversationSummaryMemory based on
   * the conversationMemoryType setting in the configuration.
   *
   * @returns Memory instance (BufferMemory or ConversationSummaryMemory)
   */
  protected initializeMemory(): BufferMemory | ConversationSummaryMemory {
    const memoryType = this.config.conversationMemoryType;
    const maxHistory = this.config.conversationMaxHistory;

    if (memoryType === "summary") {
      this.logger.info("Initializing ConversationSummaryMemory", {
        maxHistory,
      });
      return new ConversationSummaryMemory({
        llm: this.chatModel,
        memoryKey: "chat_history",
        inputKey: "input",
        outputKey: "output",
      });
    } else {
      // Default to buffer memory
      this.logger.info("Initializing BufferMemory", {
        maxHistory,
      });
      return new BufferMemory({
        memoryKey: "chat_history",
        inputKey: "input",
        returnMessages: true,
      });
    }
  }

  /**
   * Generate a response from the AI model
   *
   * Implements the AIProviderPort interface. Formats the prompt and context,
   * sends to the LangChain chat model, and returns the response.
   *
   * LangSmith tracing is automatically enabled when environment variables are set.
   * Traces include model calls, token usage, latency, and errors.
   *
   * Includes exponential backoff retry logic (max 3 retries) for transient failures.
   *
   * @param prompt - The prompt to send to the AI model
   * @param context - Optional conversation context for maintaining conversation history
   * @param systemPrompt - Optional system prompt to set AI behavior and context
   * @returns Promise resolving to the AI-generated response string
   */
  public async generateResponse(
    prompt: string,
    context?: ConversationContext,
    systemPrompt?: string
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | unknown;
    const generationStartTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Log AI model call initiation
        this.logger.info("AI model call initiated", {
          provider: this.getProviderType(),
          model: this.chatModel.constructor.name,
          hasContext: !!context,
          contextUserId: context?.userId,
          promptLength: prompt.length,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
        });

        // Create prompt template with optional system message
        const promptMessages: Array<[string, string] | MessagesPlaceholder> =
          [];

        // Add system message if provided
        if (systemPrompt) {
          promptMessages.push(["system", systemPrompt]);
        }

        // Add conversation history placeholder
        promptMessages.push(new MessagesPlaceholder("chat_history"));

        // Add user input
        promptMessages.push(["human", "{input}"]);

        const promptTemplate = ChatPromptTemplate.fromMessages(promptMessages);

        // Create chain with memory
        const chain = new LLMChain({
          llm: this.chatModel,
          prompt: promptTemplate,
          memory: this.memory,
        });

        // Format previous messages from context (excluding current prompt)
        const previousMessages: BaseMessage[] = [];
        if (context && context.messages.length > 0) {
          for (const msg of context.messages) {
            if (msg.role === "user") {
              previousMessages.push(new HumanMessage(msg.content));
            } else if (msg.role === "assistant") {
              previousMessages.push(new AIMessage(msg.content));
            }
          }
        }

        // Invoke chain with input
        // Only pass chat_history if we have previous messages from context
        // Otherwise, let memory handle it automatically
        // LangChain will automatically send traces to LangSmith if enabled
        const invokeStartTime = Date.now();
        const invokeInput: Record<string, any> = { input: prompt };
        if (previousMessages.length > 0) {
          invokeInput.chat_history = previousMessages;
        }
        const result = await chain.invoke(invokeInput);
        const invokeTimeMs = Date.now() - invokeStartTime;
        const totalGenerationTimeMs = Date.now() - generationStartTime;

        const response = result.text || result.output || String(result);

        // Extract token usage from result metadata if available
        // LangChain responses may include usage_metadata with token counts
        let tokenUsage:
          | {
              promptTokens?: number;
              completionTokens?: number;
              totalTokens?: number;
            }
          | undefined;
        if (result.response_metadata) {
          const metadata = result.response_metadata;
          if (metadata.usage_metadata) {
            tokenUsage = {
              promptTokens: metadata.usage_metadata.input_tokens,
              completionTokens: metadata.usage_metadata.output_tokens,
              totalTokens: metadata.usage_metadata.total_tokens,
            };
          }
        }

        // Log AI response generation with comprehensive metrics
        this.logger.info("AI response generated successfully", {
          provider: this.getProviderType(),
          model: this.chatModel.constructor.name,
          responseLength: response.length,
          responseGenerationTimeMs: invokeTimeMs,
          totalGenerationTimeMs: totalGenerationTimeMs,
          attempt: attempt + 1,
          tokenUsage: tokenUsage || undefined, // Log token usage if available
        });

        return response;
      } catch (error) {
        lastError = error;

        // Log error with attempt information
        this.logger.warn("Error generating AI response", {
          provider: this.getProviderType(),
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          this.logger.error("Max retries reached for AI response generation", {
            provider: this.getProviderType(),
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        // Calculate exponential backoff delay: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt) * 1000;
        this.logger.info(`Retrying AI response generation after ${delayMs}ms`, {
          provider: this.getProviderType(),
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to generate AI response after all retries");
  }

  /**
   * Format messages for LangChain chat model
   *
   * Converts ConversationContext messages to LangChain BaseMessage format.
   *
   * @param prompt - Current prompt
   * @param context - Optional conversation context
   * @returns Array of LangChain BaseMessage objects
   */
  protected formatMessages(
    prompt: string,
    context?: ConversationContext
  ): BaseMessage[] {
    const messages: BaseMessage[] = [];

    // Add conversation history from context if available
    if (context && context.messages.length > 0) {
      for (const msg of context.messages) {
        if (msg.role === "user") {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
          messages.push(new AIMessage(msg.content));
        }
      }
    }

    // Add current prompt as human message
    messages.push(new HumanMessage(prompt));

    return messages;
  }
}
