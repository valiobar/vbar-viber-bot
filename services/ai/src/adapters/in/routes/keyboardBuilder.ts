/**
 * Keyboard Builder Routes
 *
 * Inbound HTTP adapter for AI keyboard generation.
 * Requires X-Service-Token. Provider is constructed lazily so missing LLM
 * env does not break service startup or unrelated routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import { Logger } from "@vbar/shared";
import { getAIConfig } from "../../../config/aiConfig";
import { createAIProvider } from "../../out/langchain/factory/AIProviderFactory";
import { AIProviderPort } from "../../../ports/out/AIProviderPort";
import { BuildKeyboardUseCaseImpl } from "../../../application/use-cases/BuildKeyboardUseCase";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function createKeyboardBuilderRouter(logger: Logger): Router {
  const router = Router();
  const config = getAIConfig();

  // Service-token middleware (same contract as /api/prompts)
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (!config.serviceToken) {
      return res.status(503).json({
        error: {
          code: "KEYBOARD_BUILDER_NOT_CONFIGURED",
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

  // Lazy provider: constructed on first generate call so missing LLM env
  // does not break service startup or unrelated routes.
  let provider: AIProviderPort | null = null;
  const getUseCase = () => {
    if (!provider) {
      provider = createAIProvider(logger);
    }
    return new BuildKeyboardUseCaseImpl(provider, logger);
  };

  router.post(
    "/generate",
    asyncHandler(async (req, res) => {
      const {
        description,
        history,
        templateButtons,
        buttonDefaults,
        currentDraft,
        availableSteps,
      } = req.body ?? {};
      res.json({
        data: await getUseCase().generate({
          description,
          history,
          templateButtons,
          buttonDefaults,
          currentDraft,
          availableSteps,
        }),
      });
    })
  );

  // Error mapping (message-based, same style as prompts adapter)
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const message = err.message || "Keyboard generation failed";
    const lower = message.toLowerCase();
    if (lower.includes("required") || lower.includes("must be")) {
      return res.status(400).json({
        error: { code: "KEYBOARD_BUILDER_VALIDATION", message },
      });
    }
    if (lower.includes("json")) {
      return res.status(502).json({
        error: {
          code: "KEYBOARD_BUILDER_BAD_AI_OUTPUT",
          message: "AI returned an unusable response, try again",
        },
      });
    }
    logger.error("Keyboard generation failed", err);
    res.status(500).json({
      error: { code: "KEYBOARD_BUILDER_FAILED", message },
    });
  });

  return router;
}
