/**
 * Prompt Template Management Routes
 *
 * Inbound HTTP adapter for prompt template CRUD.
 * Requires X-Service-Token; works with RAG on or off.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Logger } from "@vbar/shared";
import { getAIConfig } from "../../../config/aiConfig";
import { MongoPromptTemplateRepository } from "../../out/mongodb/PromptTemplateRepository";
import { ManagePromptsUseCaseImpl } from "../../../application/use-cases/ManagePromptsUseCase";
import { PromptTaskType } from "../../../ports/in/ManagePromptsUseCase";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function createPromptsRouter(logger: Logger): Router {
  const router = Router();
  const config = getAIConfig();

  // Service-token middleware (same contract as /api/knowledge-base)
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (!config.serviceToken) {
      return res.status(503).json({
        error: {
          code: "PROMPTS_NOT_CONFIGURED",
          message: "AI_SERVICE_TOKEN is not set on the AI service",
        },
      });
    }
    if (req.header("x-service-token") !== config.serviceToken) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or missing X-Service-Token",
        },
      });
    }
    next();
  });

  const useCase = new ManagePromptsUseCaseImpl(
    new MongoPromptTemplateRepository(logger),
    logger
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const taskType =
        (req.query.taskType as PromptTaskType | undefined) || undefined;
      res.json({ data: await useCase.list(taskType) });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      res.status(201).json({ data: await useCase.create(req.body) });
    })
  );

  router.get(
    "/:name",
    asyncHandler(async (req, res) => {
      res.json({ data: await useCase.get(req.params.name) });
    })
  );

  router.put(
    "/:name",
    asyncHandler(async (req, res) => {
      res.json({ data: await useCase.update(req.params.name, req.body) });
    })
  );

  router.delete(
    "/:name",
    asyncHandler(async (req, res) => {
      await useCase.delete(req.params.name);
      res.json({ data: { deleted: true } });
    })
  );

  // Error mapping (message-based, same style as the knowledge-base adapter)
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const message = err.message || "Prompt operation failed";
    const lower = message.toLowerCase();
    if (lower.includes("already exists")) {
      return res
        .status(409)
        .json({ error: { code: "PROMPT_CONFLICT", message } });
    }
    if (lower.includes("not found")) {
      return res
        .status(404)
        .json({ error: { code: "PROMPT_NOT_FOUND", message } });
    }
    if (
      lower.includes("must") ||
      lower.includes("required") ||
      lower.includes("invalid") ||
      lower.includes("unsupported")
    ) {
      return res
        .status(400)
        .json({ error: { code: "PROMPT_VALIDATION", message } });
    }
    logger.error("Prompt operation failed", err);
    res.status(500).json({ error: { code: "PROMPT_FAILED", message } });
  });

  return router;
}
