/**
 * gRPC Server Adapter for AI Service
 *
 * Implements the gRPC server that receives message processing requests
 * from the Viber service and returns responses.
 */

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import * as fs from "fs";
import { Logger, PathUtils, ConsoleLogger } from "@vbar/shared";
import { ProcessMessageUseCaseImpl } from "../../../application/use-cases/ProcessMessageUseCase";
import { MessageRequest, MessageResponse } from "../../../domains/ai/entities";
import { createAIProvider } from "../../../adapters/out/langchain/factory/AIProviderFactory";
import { createVectorStore } from "../../../adapters/out/langchain/rag/VectorStoreFactory";
import { LangChainExecutor } from "../../../adapters/out/langchain/ChainExecutor";
import { MongoConversationRepository } from "../../../adapters/out/mongodb/ConversationRepository";
import { MongoPromptTemplateRepository } from "../../../adapters/out/mongodb/PromptTemplateRepository";

// Define the proto file path - from shared package
const projectRoot = PathUtils.findProjectRoot(__dirname);
const PROTO_PATH = path.join(
  projectRoot,
  "packages/shared/proto/ai_service.proto"
);

// Verify proto file exists
if (!fs.existsSync(PROTO_PATH)) {
  throw new Error(
    `Proto file not found at: ${PROTO_PATH}. ` +
      `Project root: ${projectRoot}, __dirname: ${__dirname}`
  );
}

// Load the proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Load the package definition
const aiProto = grpc.loadPackageDefinition(packageDefinition) as any;

/**
 * Creates and configures the gRPC server
 *
 * @param logger - Logger instance for logging
 * @returns Configured gRPC server instance
 */
export function createGrpcServer(logger: Logger): grpc.Server {
  const server = new grpc.Server();

  // Create logger instance
  const serviceLogger = new ConsoleLogger("AIService");

  // Create AI provider
  const aiProvider = createAIProvider(serviceLogger);

  // Create vector store
  const vectorStore = createVectorStore(serviceLogger);

  // Create prompt template repository
  const promptTemplateRepository = new MongoPromptTemplateRepository(
    serviceLogger
  );

  // Create chain executor
  const chainExecutor = new LangChainExecutor(
    aiProvider,
    vectorStore,
    promptTemplateRepository,
    serviceLogger
  );

  // Create conversation repository
  const conversationRepository = new MongoConversationRepository(serviceLogger);

  // Create use case
  const processMessageUseCase = new ProcessMessageUseCaseImpl(
    chainExecutor,
    conversationRepository,
    serviceLogger
  );

  // Implement the ProcessMessage RPC method
  server.addService(aiProto.ai.AIProcessingService.service, {
    ProcessMessage: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const request = call.request;

        // Log the received message data
        serviceLogger.info("AI Service - Received message", {
          messageContent: request.messageContent,
          messageType: request.messageType,
          userId: request.userId,
          stepId: request.stepId,
          userProfile: request.userProfile,
        });

        // Map gRPC request to MessageRequest domain entity
        const messageRequest = new MessageRequest(
          request.messageContent,
          request.messageType,
          request.userId,
          request.stepId,
          request.userProfile
            ? {
                id: request.userProfile.id,
                name: request.userProfile.name,
                avatar: request.userProfile.avatar,
              }
            : undefined,
          request.taskType
        );

        // Call use case to process message
        const messageResponse: MessageResponse =
          await processMessageUseCase.execute(messageRequest);

        // Map MessageResponse to gRPC response format
        const response = {
          response: messageResponse.response,
        };

        serviceLogger.info("AI Service - Sending response", {
          responseLength: messageResponse.response.length,
          model: messageResponse.model,
          processingTimeMs: messageResponse.processingTimeMs,
        });

        callback(null, response);
      } catch (error) {
        // Determine appropriate gRPC error code based on error type
        let grpcStatusCode: grpc.status;
        let errorMessage: string;

        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          // Map error types to gRPC status codes
          if (
            errorMsg.includes("api key") ||
            errorMsg.includes("authentication") ||
            errorMsg.includes("unauthorized")
          ) {
            grpcStatusCode = grpc.status.UNAUTHENTICATED;
            errorMessage = "Authentication failed with AI provider";
          } else if (
            errorMsg.includes("rate limit") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("too many requests")
          ) {
            grpcStatusCode = grpc.status.RESOURCE_EXHAUSTED;
            errorMessage = "AI provider rate limit exceeded";
          } else if (
            errorMsg.includes("database") ||
            errorMsg.includes("mongodb") ||
            errorMsg.includes("connection") ||
            errorMsg.includes("repository")
          ) {
            grpcStatusCode = grpc.status.UNAVAILABLE;
            errorMessage = "Database connection error";
          } else if (
            errorMsg.includes("invalid") ||
            errorMsg.includes("validation") ||
            errorMsg.includes("required")
          ) {
            grpcStatusCode = grpc.status.INVALID_ARGUMENT;
            errorMessage = error.message;
          } else if (
            errorMsg.includes("not found") ||
            errorMsg.includes("missing")
          ) {
            grpcStatusCode = grpc.status.NOT_FOUND;
            errorMessage = error.message;
          } else {
            // Default to INTERNAL for unknown errors
            grpcStatusCode = grpc.status.INTERNAL;
            errorMessage = error.message || "Unknown error occurred";
          }
        } else {
          grpcStatusCode = grpc.status.INTERNAL;
          errorMessage = "Unknown error occurred";
        }

        // Log error with comprehensive context
        serviceLogger.error("AI Service - Error processing message", {
          grpcStatusCode,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: call.request?.userId,
          stepId: call.request?.stepId,
        });

        // Return error via callback with appropriate gRPC status code
        const grpcError = {
          code: grpcStatusCode,
          message: errorMessage,
        };

        callback(grpcError);
      }
    },
  });

  return server;
}
