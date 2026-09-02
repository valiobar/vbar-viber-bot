import { randomUUID } from "node:crypto";
import { Logger } from "@vbar/shared";
import {
  IngestKnowledgeUseCase,
  IngestFileInput,
  IngestResult,
  IngestResultItem,
  KnowledgeSource,
} from "../../ports/in/IngestKnowledgeUseCase";
import { VectorStorePort } from "../../ports/out/VectorStorePort";
import { DocumentProcessor } from "../../adapters/out/ingest/DocumentProcessor";
import { IngestConfig } from "../../config/aiConfig";

const URL_CONCURRENCY = 3;

/**
 * Ingest Knowledge Use Case Implementation
 *
 * Orchestrates file/URL extraction, chunking, and vector-store writes.
 * Per-item errors never abort the rest of the batch.
 */
export class IngestKnowledgeUseCaseImpl implements IngestKnowledgeUseCase {
  constructor(
    private readonly vectorStore: VectorStorePort,
    private readonly documentProcessor: DocumentProcessor,
    private readonly ingestConfig: IngestConfig,
    private readonly logger: Logger
  ) {}

  async ingestFiles(files: IngestFileInput[]): Promise<IngestResult> {
    this.logger.info(`Ingesting ${files.length} file(s)...`);
    const items: IngestResultItem[] = [];
    for (const file of files) {
      try {
        const { text, fileType } = await this.documentProcessor.extractFromFile(
          file.buffer,
          file.filename,
          file.mimeType
        );
        const chunks = await this.documentProcessor.chunk(text, this.ingestConfig);
        const sourceId = randomUUID();
        const ingestedAt = new Date().toISOString();
        await this.vectorStore.addDocuments(
          chunks.map((content, chunkIndex) => ({
            content,
            metadata: {
              sourceId,
              source: file.filename,
              sourceType: "file",
              fileType,
              chunkIndex,
              ingestedAt,
            },
          }))
        );
        items.push({
          source: file.filename,
          status: "success",
          chunks: chunks.length,
          sourceId,
        });
      } catch (error) {
        items.push({
          source: file.filename,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const totalChunks = items.reduce((sum, item) => sum + (item.chunks ?? 0), 0);
    this.logger.info(
      `File ingest finished: ${items.filter((i) => i.status === "success").length}/${files.length} ok, ${totalChunks} chunks`
    );
    return { items, totalChunks };
  }

  async ingestUrls(urls: string[]): Promise<IngestResult> {
    const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
    if (unique.length > this.ingestConfig.maxUrlsPerRequest) {
      throw new Error(
        `Too many URLs: ${unique.length} (max ${this.ingestConfig.maxUrlsPerRequest})`
      );
    }
    this.logger.info(`Ingesting ${unique.length} URL(s)...`);
    const items: IngestResultItem[] = [];
    for (let i = 0; i < unique.length; i += URL_CONCURRENCY) {
      const batch = unique.slice(i, i + URL_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((url) => this.ingestSingleUrl(url))
      );
      settled.forEach((result, idx) => {
        items.push(
          result.status === "fulfilled"
            ? result.value
            : {
                source: batch[idx],
                status: "error",
                error:
                  result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason),
              }
        );
      });
    }
    const totalChunks = items.reduce((sum, item) => sum + (item.chunks ?? 0), 0);
    this.logger.info(
      `URL ingest finished: ${items.filter((i) => i.status === "success").length}/${unique.length} ok, ${totalChunks} chunks`
    );
    return { items, totalChunks };
  }

  private async ingestSingleUrl(url: string): Promise<IngestResultItem> {
    const { text, fileType } = await this.documentProcessor.fetchUrl(
      url,
      this.ingestConfig.urlFetchTimeoutMs
    );
    const chunks = await this.documentProcessor.chunk(text, this.ingestConfig);
    const sourceId = randomUUID();
    const ingestedAt = new Date().toISOString();
    await this.vectorStore.addDocuments(
      chunks.map((content, chunkIndex) => ({
        content,
        metadata: {
          sourceId,
          source: url,
          sourceType: "url",
          fileType,
          chunkIndex,
          ingestedAt,
        },
      }))
    );
    return { source: url, status: "success", chunks: chunks.length, sourceId };
  }

  async listSources(): Promise<KnowledgeSource[]> {
    return this.vectorStore.listSources();
  }

  async deleteSource(sourceId: string): Promise<void> {
    await this.vectorStore.deleteDocuments({ sourceId });
  }

  async clearAll(): Promise<void> {
    await this.vectorStore.clear();
  }
}
