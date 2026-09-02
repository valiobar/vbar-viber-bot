import { Logger, ConfigHelper } from "@vbar/shared";
import { ProcessMessageUseCase } from "../../ports/in/ProcessMessageUseCase";
import {
  MessageRequest,
  MessageResponse,
  AITask,
  ConversationContext,
} from "../../domains/ai/entities";
import {
  AITaskType,
  parseAITaskType,
} from "../../domains/ai/value-objects/AITaskType";
import { AIProvider } from "../../domains/ai/value-objects/AIProvider";
import { ChainExecutorPort } from "../../ports/out/ChainExecutorPort";
import { ConversationRepository } from "../../ports/out/ConversationRepository";
import { getAIConfig } from "../../config/aiConfig";

/**
 * Process Message Use Case Implementation
 *
 * Orchestrates task selection, chain execution, conversation history retrieval,
 * AI processing, and response saving following Hexagonal Architecture principles.
 */
export class ProcessMessageUseCaseImpl implements ProcessMessageUseCase {
  private readonly chainExecutor: ChainExecutorPort;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;

  constructor(
    chainExecutor: ChainExecutorPort,
    conversationRepository: ConversationRepository,
    logger: Logger
  ) {
    this.chainExecutor = chainExecutor;
    this.conversationRepository = conversationRepository;
    this.logger = logger;
  }

  /**
   * Execute message processing
   *
   * @param request - Message request containing user message and context
   * @returns Promise resolving to message response with AI-generated content
   */
  async execute(request: MessageRequest): Promise<MessageResponse> {
    const startTime = Date.now();

    try {
      // Log request received with structured data
      this.logger.info("Processing message - request received", {
        userId: request.userId,
        stepId: request.stepId,
        messageType: request.messageType,
        messageContent: request.messageContent,
        messageLength: request.messageContent.length,
      });

      // Get conversation history
      let conversationContext: ConversationContext | null = null;
      try {
        conversationContext =
          await this.conversationRepository.getConversationHistory(
            request.userId
          );
        if (conversationContext) {
          this.logger.debug("Retrieved conversation history", {
            userId: request.userId,
            messageCount: conversationContext.messages.length,
          });
        }
      } catch (error) {
        this.logger.warn(
          "Failed to retrieve conversation history, continuing without context",
          {
            userId: request.userId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      // Explicit taskType (request or AI_TASK_TYPE) wins; otherwise RAG_ENABLED
      // selects RAG. An unset AI_TASK_TYPE is not treated as "simple".
      const aiConfig = getAIConfig();
      const explicitTaskTypeStr = (
        request.taskType ||
        ConfigHelper.getEnv("AI_TASK_TYPE", "") ||
        ""
      ).trim();

      let explicitTaskType: AITaskType | undefined;
      if (explicitTaskTypeStr) {
        try {
          explicitTaskType = parseAITaskType(explicitTaskTypeStr);
        } catch (error) {
          this.logger.warn("Invalid task type, defaulting to simple", {
            error: error instanceof Error ? error.message : String(error),
            providedTaskType: request.taskType,
            envTaskType: process.env.AI_TASK_TYPE,
          });
          explicitTaskType = AITaskType.SIMPLE;
        }
      }

      const ragEnabled =
        aiConfig.rag.enabled || explicitTaskType === AITaskType.RAG;
      const taskType =
        explicitTaskType ??
        (ragEnabled ? AITaskType.RAG : AITaskType.SIMPLE);

      this.logger.info("AI provider configuration", {
        provider: aiConfig.provider,
        model: this.getModelName(aiConfig),
        taskType,
        taskTypeExplicit: !!explicitTaskTypeStr,
        ragEnabled,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      // Create AITask entity based on task type
      const task = new AITask(
        taskType,
        ragEnabled,
        taskType === AITaskType.CUSTOM
          ? ConfigHelper.getEnv("PROMPT_TEMPLATE_DEFAULT")
          : undefined,
        {
          stepId: request.stepId,
          messageType: request.messageType,
          userId: request.userId,
        }
      );

      this.logger.debug("Created AI task", {
        taskType: task.taskType,
        ragEnabled: task.ragEnabled,
        promptTemplateName: task.promptTemplateName,
      });

      // Execute chain with task, message content, and context
      const aiResponse = await this.chainExecutor.executeTask(
        task,
        request.messageContent,
        conversationContext || undefined
      );

      // Save user message to repository
      try {
        await this.conversationRepository.saveMessage(
          request.userId,
          "user",
          request.messageContent
        );
      } catch (error) {
        this.logger.warn(
          "Failed to save user message to conversation history",
          {
            userId: request.userId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      // Save AI response to repository
      try {
        await this.conversationRepository.saveMessage(
          request.userId,
          "assistant",
          aiResponse
        );
      } catch (error) {
        this.logger.warn("Failed to save AI response to conversation history", {
          userId: request.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;

      // Get model information from config (if available)
      const model = this.getModelName(aiConfig);

      // Create and return MessageResponse
      // Note: Token usage would come from LangChain response metadata if available
      const response = new MessageResponse(
        aiResponse,
        model,
        undefined, // Token usage would come from LangChain response metadata
        processingTimeMs
      );

      // Log response generated with comprehensive metrics
      this.logger.info("Message processed successfully - response generated", {
        userId: request.userId,
        stepId: request.stepId,
        processingTimeMs,
        responseLength: aiResponse.length,
        model,
        provider: aiConfig.provider,
        taskType: task.taskType,
        // Token usage would be logged here if available from LangChain response metadata
        // tokensUsed: response.tokensUsed,
      });

      return response;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // Determine error type and create appropriate error message
      let errorMessage: string;
      let errorType: string;

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        // Check if it's an AI provider error
        if (
          errorMsg.includes("api key") ||
          errorMsg.includes("authentication") ||
          errorMsg.includes("rate limit") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("model") ||
          errorMsg.includes("openai") ||
          errorMsg.includes("anthropic") ||
          errorMsg.includes("google") ||
          errorMsg.includes("ollama")
        ) {
          errorType = "AI_PROVIDER_ERROR";
          errorMessage = `AI provider error: ${error.message}`;
        }
        // Check if it's a repository/database error
        else if (
          errorMsg.includes("database") ||
          errorMsg.includes("mongodb") ||
          errorMsg.includes("connection") ||
          errorMsg.includes("repository")
        ) {
          errorType = "REPOSITORY_ERROR";
          errorMessage = `Repository error: ${error.message}`;
        }
        // Check if it's a chain executor error
        else if (
          errorMsg.includes("chain") ||
          errorMsg.includes("template") ||
          errorMsg.includes("rag") ||
          errorMsg.includes("vector store")
        ) {
          errorType = "CHAIN_EXECUTOR_ERROR";
          errorMessage = `Chain execution error: ${error.message}`;
        }
        // Generic error
        else {
          errorType = "PROCESSING_ERROR";
          errorMessage = `Processing error: ${error.message}`;
        }
      } else {
        errorType = "UNKNOWN_ERROR";
        errorMessage = `Unknown error: ${String(error)}`;
      }

      // Log error with comprehensive context
      this.logger.error("Failed to process message", {
        userId: request.userId,
        stepId: request.stepId,
        messageType: request.messageType,
        messageLength: request.messageContent.length,
        processingTimeMs,
        errorType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw with domain-specific error message
      const domainError = new Error(errorMessage);
      if (error instanceof Error && error.stack) {
        domainError.stack = error.stack;
      }
      throw domainError;
    }
  }

  /**
   * Get model name from AI config based on provider
   * @param config - AI configuration
   * @returns Model name or undefined
   */
  private getModelName(
    config: ReturnType<typeof getAIConfig>
  ): string | undefined {
    switch (config.provider) {
      case AIProvider.OPENAI:
        return config.openai?.model;
      case AIProvider.OLLAMA:
        return config.ollama?.model;
      case AIProvider.ANTHROPIC:
        return config.anthropic?.model;
      case AIProvider.GOOGLE:
        return config.google?.model;
      default:
        return undefined;
    }
  }
}
