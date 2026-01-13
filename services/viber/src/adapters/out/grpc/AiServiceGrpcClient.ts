/**
 * gRPC Client Adapter for AI Service
 *
 * Output adapter for communicating with the AI Service via gRPC.
 * This adapter implements the IAiServiceClient port interface
 * following Hexagonal Architecture principles.
 *
 * Location: Output Adapters layer (Hexagonal Architecture)
 */

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import { IAiServiceClient } from "../../../ports/out/IAiServiceClient";
import { Logger, PathUtils, ConfigHelper } from "@vbar/shared";

// Define the proto file path - from shared package
const projectRoot = PathUtils.findProjectRoot(__dirname);
const PROTO_PATH = path.join(
  projectRoot,
  "packages/shared/proto/ai_service.proto"
);

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
 * gRPC Client for AI Service
 *
 * Implements gRPC client for AI service communication with:
 * - Connection to AI service gRPC server
 * - Error handling for network and gRPC errors
 * - Logging for debugging and monitoring
 */
export class AiServiceGrpcClient implements IAiServiceClient {
  private client: any;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;

    // Get AI service host and port from environment
    const aiHost = ConfigHelper.getEnv("AI_SERVICE_GRPC_HOST", "localhost");
    const aiPort = ConfigHelper.getEnvNumber("AI_SERVICE_GRPC_PORT", 50051);

    // Create gRPC client stub
    this.client = new aiProto.ai.AIProcessingService(
      `${aiHost}:${aiPort}`,
      grpc.credentials.createInsecure()
    );

    this.logger.info("AI Service gRPC client initialized", {
      host: aiHost,
      port: aiPort,
    });
  }

  /**
   * Process a message through the AI service
   *
   * @param data - Message data to process
   * @returns Promise resolving to AI service response
   * @throws Error if request fails or processing cannot be completed
   */
  async processMessage(data: {
    messageContent: string;
    messageType: string;
    userId: string;
    stepId: string;
    userProfile?: {
      id: string;
      name: string;
      avatar?: string;
    };
    taskType?: string;
  }): Promise<{ response: string }> {
    return new Promise((resolve, reject) => {
      try {
        // Create request object from input data
        const request = {
          messageContent: data.messageContent,
          messageType: data.messageType,
          userId: data.userId,
          stepId: data.stepId,
          userProfile: data.userProfile
            ? {
                id: data.userProfile.id,
                name: data.userProfile.name,
                avatar: data.userProfile.avatar || "",
              }
            : undefined,
          taskType: data.taskType,
        };

        // Call gRPC ProcessMessage method
        this.client.ProcessMessage(
          request,
          (error: grpc.ServiceError | null, response: any) => {
            if (error) {
              this.logger.error("AI Service gRPC call failed", {
                error: error.message,
                code: error.code,
                details: error.details,
              });
              reject(
                new Error(
                  `AI Service error: ${error.message} (code: ${error.code})`
                )
              );
              return;
            }

            if (!response || !response.response) {
              this.logger.error("AI Service returned invalid response", {
                response,
              });
              reject(new Error("AI Service returned invalid response"));
              return;
            }

            // Return response
            resolve({ response: response.response });
          }
        );
      } catch (error) {
        this.logger.error("AI Service gRPC call error", error as Error);
        reject(
          error instanceof Error
            ? error
            : new Error("Unknown error during AI Service call")
        );
      }
    });
  }
}
