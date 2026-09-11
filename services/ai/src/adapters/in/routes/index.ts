/**
 * AI Service Routes
 *
 * Input adapters for HTTP endpoints following Hexagonal Architecture
 */

import { Router } from "express";
import { Logger } from "@vbar/shared";
import healthRoutes from "./health";
import { createKnowledgeBaseRouter } from "./knowledgeBase";
import { createPromptsRouter } from "./prompts";
import { VectorStorePort } from "../../../ports/out/VectorStorePort";

export function createRoutes(
  vectorStore: VectorStorePort | null,
  logger: Logger
): Router {
  const router = Router();
  router.use("/api/health", healthRoutes);
  router.use("/api/knowledge-base", createKnowledgeBaseRouter(vectorStore, logger));
  router.use("/api/prompts", createPromptsRouter(logger));
  return router;
}
