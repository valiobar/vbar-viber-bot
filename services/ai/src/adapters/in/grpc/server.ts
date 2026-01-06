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
import { Logger, PathUtils } from "@vbar/shared";

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

  // Implement the ProcessMessage RPC method
  server.addService(aiProto.ai.AIProcessingService.service, {
    ProcessMessage: (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const request = call.request;

        // Log the received message data
        console.log("AI Service - Received message:", {
          messageContent: request.messageContent,
          messageType: request.messageType,
          userId: request.userId,
          stepId: request.stepId,
          userProfile: request.userProfile,
        });

        // Wait 2 seconds before responding
        setTimeout(() => {
          // Return hardcoded response
          const response = {
            response: `AI processed: ${request.messageContent}`,
          };

          logger.info("AI Service - Sending response", { response });
          callback(null, response);
        }, 2000);
      } catch (error) {
        logger.error("AI Service - Error processing message", error as Error);
        callback({
          code: grpc.status.INTERNAL,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });

  return server;
}
