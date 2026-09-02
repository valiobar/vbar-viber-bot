/**
 * LangChain Chain Executor Adapter
 *
 * Implements ChainExecutorPort using LangChain for executing different types of chains.
 * Supports simple prompts, RAG (Retrieval Augmented Generation), and custom template-based chains.
 */

import { ChainExecutorPort } from "../../../ports/out/ChainExecutorPort";
import { AITask, ConversationContext } from "../../../domains/ai/entities";
import { AIProviderPort } from "../../../ports/out/AIProviderPort";
import { VectorStorePort } from "../../../ports/out/VectorStorePort";
import { PromptTemplateRepository } from "../../../ports/out/PromptTemplateRepository";
import { PromptTemplateService } from "../../../domains/ai/services/PromptTemplateService";
import { CultureDetectionService } from "../../../domains/ai/services/CultureDetectionService";
import { getAIConfig } from "../../../config/aiConfig";
import { Logger } from "@vbar/shared";
import { AITaskType } from "../../../domains/ai/value-objects/AITaskType";

/**
 * LangChain Chain Executor implementation
 *
 * Executes different types of AI chains:
 * - Simple chains: Direct prompts to AI model
 * - RAG chains: Retrieval Augmented Generation with vector store
 * - Custom chains: Template-based chains with variable substitution
 */
export class LangChainExecutor implements ChainExecutorPort {
  private readonly aiProvider: AIProviderPort;
  private readonly vectorStore: VectorStorePort | null;
  private readonly promptTemplateRepository: PromptTemplateRepository;
  private readonly logger: Logger;

  /**
   * Constructor
   *
   * @param aiProvider - AI provider port for generating responses
   * @param vectorStore - Vector store port for RAG (optional, null if RAG not enabled)
   * @param promptTemplateRepository - Repository for loading prompt templates
   * @param logger - Logger instance for logging
   */
  constructor(
    aiProvider: AIProviderPort,
    vectorStore: VectorStorePort | null,
    promptTemplateRepository: PromptTemplateRepository,
    logger: Logger
  ) {
    this.aiProvider = aiProvider;
    this.vectorStore = vectorStore;
    this.promptTemplateRepository = promptTemplateRepository;
    this.logger = logger;
  }

  /**
   * Execute a simple prompt chain (direct prompt to AI model)
   *
   * @param prompt - The prompt to execute
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response
   */
  async executeSimpleChain(
    prompt: string,
    context?: ConversationContext
  ): Promise<string> {
    try {
      this.logger.debug("Executing simple chain", {
        promptLength: prompt.length,
        hasContext: !!context,
      });

      // Get Bulgarian culture prompt configuration
      const aiConfig = getAIConfig();
      let systemPrompt: string | undefined;

      if (aiConfig.bulgarianCulturePromptTemplate) {
        try {
          // Load prompt template from repository
          const template = await this.promptTemplateRepository.getTemplate(
            aiConfig.bulgarianCulturePromptTemplate
          );

          if (template) {
            // Detect if message is about Bulgarian culture
            const isCultureRelated =
              CultureDetectionService.isBulgarianCultureRelated(prompt);

            // Use template content from database
            // For culture-related questions, try to load enhanced template
            if (isCultureRelated) {
              const enhancedTemplateName = `${aiConfig.bulgarianCulturePromptTemplate}_enhanced`;
              const enhancedTemplate =
                await this.promptTemplateRepository.getTemplate(
                  enhancedTemplateName
                );
              if (enhancedTemplate) {
                systemPrompt = enhancedTemplate.template;
                this.logger.debug(
                  "Using enhanced Bulgarian culture system prompt",
                  {
                    templateName: enhancedTemplateName,
                  }
                );
              } else {
                // Fall back to base template if enhanced doesn't exist
                systemPrompt = template.template;
                this.logger.debug(
                  "Enhanced template not found, using base template",
                  {
                    templateName: aiConfig.bulgarianCulturePromptTemplate,
                  }
                );
              }
            } else {
              // Use base template for non-culture-related questions
              systemPrompt = template.template;
              this.logger.debug("Using base Bulgarian culture system prompt", {
                templateName: aiConfig.bulgarianCulturePromptTemplate,
              });
            }
          } else {
            this.logger.warn(
              `Bulgarian culture prompt template "${aiConfig.bulgarianCulturePromptTemplate}" not found, continuing without system prompt`
            );
          }
        } catch (error) {
          this.logger.warn(
            "Failed to load Bulgarian culture prompt template, continuing without system prompt",
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }

      // Add response length constraint to system prompt
      if (systemPrompt) {
        systemPrompt = `${systemPrompt}\n\nIMPORTANT: Keep your response under 700 characters.
        Do NOT reveal your reasoning or chain-of-thought.
        Respond with only the final answer.`;
      } else {
        systemPrompt =
          "IMPORTANT: Keep your response under 700 characters. Do NOT reveal your reasoning or chain-of-thought. Respond with only the final answer.";
      }
      const stripReasoning = (text: string): string => {
        // Remove anything between <think>...</think>
        const answer = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        const answerWithoutThinking = answer
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
          .trim();
        return answerWithoutThinking;
      };
      // Generate response with optional system prompt
      const response = await this.aiProvider.generateResponse(
        prompt,
        context,
        systemPrompt
      );

      this.logger.debug("Simple chain executed successfully", {
        responseLength: response.length,
        hadSystemPrompt: !!systemPrompt,
      });

      return stripReasoning(response);
    } catch (error) {
      this.logger.error("Error executing simple chain", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Execute a RAG chain with retrieval from vector store
   *
   * Retrieves relevant documents from the vector store and uses them as context
   * for generating the AI response.
   *
   * @param query - The search query
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response with retrieved context
   */
  async executeRAGChain(
    query: string,
    context?: ConversationContext
  ): Promise<string> {
    try {
      if (!this.vectorStore) {
        throw new Error(
          "Vector store is not available. RAG requires a vector store to be configured."
        );
      }

      this.logger.debug("Executing RAG chain", {
        query,
        hasContext: !!context,
      });

      // Retrieve relevant documents from vector store
      const { retrieverK: k, similarityThreshold: threshold } =
        getAIConfig().rag;
      const retrievedDocs = await this.vectorStore.similaritySearch(
        query,
        k,
        threshold
      );

      this.logger.debug("Retrieved documents for RAG", {
        documentCount: retrievedDocs.length,
        query,
      });

      // Format retrieved documents as context
      const contextText = retrievedDocs
        .map((doc, index) => `[Document ${index + 1}]\n${doc.content}`)
        .join("\n\n");

      // Create enhanced prompt with retrieved context
      const enhancedPrompt = `Based on the following context, answer the question. If the context doesn't contain enough information to answer the question, say so.

IMPORTANT: Keep your response under 700 characters.

Context:
${contextText}

Question: ${query}

Answer:`;

      // Generate response using AI provider with enhanced prompt
      const response = await this.aiProvider.generateResponse(
        enhancedPrompt,
        context
      );

      this.logger.debug("RAG chain executed successfully", {
        responseLength: response.length,
        documentsUsed: retrievedDocs.length,
      });

      return response;
    } catch (error) {
      this.logger.error("Error executing RAG chain", {
        query,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Execute a custom chain from a template
   *
   * Loads a prompt template from the repository, renders it with provided variables,
   * and executes it using the AI provider.
   *
   * @param templateName - The name of the template to use
   * @param variables - Variables to inject into the template
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response
   */
  async executeCustomChain(
    templateName: string,
    variables: Record<string, string>,
    context?: ConversationContext
  ): Promise<string> {
    try {
      this.logger.debug("Executing custom chain", {
        templateName,
        variables: Object.keys(variables),
        hasContext: !!context,
      });

      // Load template from repository
      const template = await this.promptTemplateRepository.getTemplate(
        templateName
      );

      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Render template with provided variables using PromptTemplateService
      let renderedPrompt = PromptTemplateService.renderTemplate(
        template,
        variables
      );

      // Add response length constraint to rendered prompt
      renderedPrompt = `${renderedPrompt}\n\nIMPORTANT: Keep your response under 700 characters.`;

      this.logger.debug("Template rendered", {
        templateName,
        renderedLength: renderedPrompt.length,
      });

      // Generate response using AI provider with rendered prompt
      const response = await this.aiProvider.generateResponse(
        renderedPrompt,
        context
      );

      this.logger.debug("Custom chain executed successfully", {
        templateName,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      this.logger.error("Error executing custom chain", {
        templateName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Execute a task based on effective task type
   *
   * Explicit `task.taskType` wins; otherwise RAG is selected when
   * `task.isRAGTask()` is true (i.e. `ragEnabled`). If the RAG chain fails
   * (e.g. vector store unavailable), fall back to the simple chain.
   *
   * @param task - The AI task to execute
   * @param input - The input string for the task
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response
   */
  async executeTask(
    task: AITask,
    input: string,
    context?: ConversationContext
  ): Promise<string> {
    const effectiveType = this.resolveEffectiveTaskType(task);

    try {
      this.logger.debug("Executing task", {
        taskType: task.taskType,
        effectiveType,
        ragEnabled: task.ragEnabled,
        templateName: task.promptTemplateName,
        hasContext: !!context,
      });

      switch (effectiveType) {
        case AITaskType.SIMPLE:
          this.logger.info("Selected chain type", { chain: "simple" });
          return await this.executeSimpleChain(input, context);

        case AITaskType.RAG:
          this.logger.info("Selected chain type", { chain: "rag" });
          try {
            return await this.executeRAGChain(input, context);
          } catch (ragError) {
            this.logger.warn(
              "RAG chain failed, falling back to simple chain",
              {
                error:
                  ragError instanceof Error
                    ? ragError.message
                    : String(ragError),
              }
            );
            return await this.executeSimpleChain(input, context);
          }

        case AITaskType.CUSTOM: {
          this.logger.info("Selected chain type", { chain: "custom" });
          if (!task.promptTemplateName) {
            throw new Error(
              "Custom task requires a prompt template name to be specified"
            );
          }

          const variables: Record<string, string> = task.metadata
            ? Object.fromEntries(
                Object.entries(task.metadata).map(([key, value]) => [
                  key,
                  String(value),
                ])
              )
            : {};

          if (!variables.input && !variables.query && !variables.message) {
            variables.input = input;
          }

          return await this.executeCustomChain(
            task.promptTemplateName,
            variables,
            context
          );
        }

        default:
          throw new Error(`Unsupported task type: ${effectiveType}`);
      }
    } catch (error) {
      this.logger.error("Error executing task", {
        taskType: task.taskType,
        effectiveType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Explicit taskType wins; otherwise fall back to RAG when ragEnabled.
   * Equivalent to `taskType || (ragEnabled ? "rag" : "simple")`.
   */
  private resolveEffectiveTaskType(task: AITask): AITaskType {
    if (task.taskType) {
      return task.taskType;
    }
    return task.isRAGTask() ? AITaskType.RAG : AITaskType.SIMPLE;
  }
}
