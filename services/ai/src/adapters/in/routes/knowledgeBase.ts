/**
 * Knowledge Base Ingest Routes
 *
 * Inbound HTTP adapter for file/URL ingest and source management.
 * Requires X-Service-Token; RAG must be enabled.
 */

import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { Logger } from "@vbar/shared";
import { getAIConfig } from "../../../config/aiConfig";
import { VectorStorePort } from "../../../ports/out/VectorStorePort";
import { DocumentProcessor } from "../../out/ingest/DocumentProcessor";
import { IngestKnowledgeUseCaseImpl } from "../../../application/use-cases/IngestKnowledgeUseCase";
import { IngestFileInput } from "../../../ports/in/IngestKnowledgeUseCase";

const ALLOWED_EXTENSIONS = /\.(pdf|md|txt)$/i;

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function createKnowledgeBaseRouter(
  vectorStore: VectorStorePort | null,
  logger: Logger
): Router {
  const router = Router();
  const config = getAIConfig();

  // 1) Service-token middleware (first)
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (!config.serviceToken) {
      logger.warn("Ingest request rejected: AI_SERVICE_TOKEN is not set");
      return res.status(503).json({
        error: {
          code: "INGEST_NOT_CONFIGURED",
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

  // 2) RAG guard (second)
  router.use((_req, res, next) => {
    if (vectorStore === null) {
      return res.status(503).json({
        error: {
          code: "RAG_DISABLED",
          message:
            "RAG is disabled (RAG_ENABLED=false); enable it to use the knowledge base",
        },
      });
    }
    next();
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.ingest.maxFileSizeMb * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
      const ok =
        ALLOWED_EXTENSIONS.test(file.originalname) ||
        file.mimetype === "application/pdf" ||
        file.mimetype.startsWith("text/");
      if (ok) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.originalname}`));
      }
    },
  });

  const documentProcessor = new DocumentProcessor(logger);
  const useCase = new IngestKnowledgeUseCaseImpl(
    vectorStore!,
    documentProcessor,
    config.ingest,
    logger
  );

  router.post(
    "/files",
    upload.array("files"),
    asyncHandler(async (req, res) => {
      const files = (req.files ?? []) as Express.Multer.File[];
      if (files.length === 0) {
        return res.status(400).json({
          error: { code: "NO_FILES", message: "No files uploaded (field name: files)" },
        });
      }
      const inputs: IngestFileInput[] = files.map((f) => ({
        buffer: f.buffer,
        filename: f.originalname,
        mimeType: f.mimetype,
      }));
      res.json({ data: await useCase.ingestFiles(inputs) });
    })
  );

  router.post(
    "/urls",
    asyncHandler(async (req, res) => {
      const urls = req.body?.urls;
      if (
        !Array.isArray(urls) ||
        urls.length === 0 ||
        urls.length > config.ingest.maxUrlsPerRequest
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_URLS",
            message: `Body must be { urls: string[] } with 1–${config.ingest.maxUrlsPerRequest} URLs`,
          },
        });
      }
      res.json({ data: await useCase.ingestUrls(urls) });
    })
  );

  router.get(
    "/sources",
    asyncHandler(async (_req, res) => {
      res.json({ data: await useCase.listSources() });
    })
  );

  router.delete(
    "/sources/:sourceId",
    asyncHandler(async (req, res) => {
      await useCase.deleteSource(req.params.sourceId);
      res.json({ data: { deleted: true } });
    })
  );

  router.delete(
    "/sources",
    asyncHandler(async (_req, res) => {
      await useCase.clearAll();
      res.json({ data: { cleared: true } });
    })
  );

  // Error mapping: multer/fileFilter → 400 INGEST_VALIDATION; everything else → 500 INGEST_FAILED.
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError || /Unsupported file type/.test(err.message)) {
      return res.status(400).json({
        error: { code: "INGEST_VALIDATION", message: err.message },
      });
    }
    logger.error("Ingest failed", err);
    res.status(500).json({ error: { code: "INGEST_FAILED", message: err.message } });
  });

  return router;
}
