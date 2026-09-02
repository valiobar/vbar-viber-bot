/**
 * Chroma Vector Store Adapter
 *
 * Implements VectorStorePort using self-hosted ChromaDB.
 */

import { VectorStorePort } from "../../../../ports/out/VectorStorePort";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
import { Logger } from "@vbar/shared";
import type { Where } from "chromadb";

/**
 * Chroma vector store implementation
 *
 * Uses LangChain's Chroma wrapper for persistent vector storage.
 * Requires Chroma running (Compose `--profile rag`).
 */
export class ChromaVectorStore implements VectorStorePort {
  private vectorStore: Chroma | null = null;
  private embeddings: Embeddings;
  private collectionName: string;
  private chromaUrl: string;
  private logger: Logger;
  private initPromise: Promise<void> | null = null;

  /**
   * Constructor
   *
   * @param embeddings - Embeddings instance for generating vector embeddings
   * @param collectionName - Chroma collection name for storing vectors
   * @param chromaUrl - Chroma HTTP URL (host: localhost; Compose: http://chromadb:8000)
   * @param logger - Logger instance for logging
   */
  constructor(
    embeddings: Embeddings,
    collectionName: string,
    chromaUrl: string,
    logger: Logger
  ) {
    this.embeddings = embeddings;
    this.collectionName = collectionName;
    this.chromaUrl = chromaUrl;
    this.logger = logger;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize Chroma vector store
   * Must be called before using the vector store
   */
  private async initialize(): Promise<void> {
    if (this.vectorStore) {
      return;
    }

    try {
      this.logger.info(
        `Initializing Chroma vector store collection=${this.collectionName} url=${this.chromaUrl}`
      );

      this.vectorStore = new Chroma(this.embeddings, {
        collectionName: this.collectionName,
        url: this.chromaUrl,
      });

      await this.vectorStore.ensureCollection();

      this.logger.info("Chroma vector store initialized successfully");
    } catch (error) {
      this.logAndThrow("Failed to initialize Chroma vector store", error);
    }
  }

  /**
   * Ensure vector store is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (this.vectorStore) {
      return;
    }
    if (this.initPromise) {
      await this.initPromise;
    } else {
      await this.initialize();
    }
  }

  /**
   * Add documents to the vector store
   *
   * @param documents - Array of documents with content and optional metadata
   */
  async addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, any> }>
  ): Promise<void> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      const langchainDocuments = documents.map(
        (doc) =>
          new Document({
            pageContent: doc.content,
            metadata: doc.metadata || {},
          })
      );

      await this.vectorStore.addDocuments(langchainDocuments);

      this.logger.info(
        `Added ${documents.length} documents to Chroma vector store`
      );
    } catch (error) {
      this.logAndThrow("Failed to add documents to vector store", error);
    }
  }

  /**
   * Search for similar documents using semantic similarity
   *
   * @param query - The search query string
   * @param k - Number of similar documents to retrieve
   * @param threshold - Optional similarity threshold (0-1) to filter results
   * @returns Array of similar documents with scores and metadata
   */
  async similaritySearch(
    query: string,
    k: number,
    threshold?: number
  ): Promise<
    Array<{
      content: string;
      score: number;
      metadata?: Record<string, any>;
    }>
  > {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k
      );

      const filteredResults = threshold
        ? results.filter(([, score]) => score >= threshold)
        : results;

      return filteredResults.map(([doc, score]) => ({
        content: doc.pageContent,
        score: score as number,
        metadata: doc.metadata,
      }));
    } catch (error) {
      this.logAndThrow("Failed to search vector store", error);
    }
  }

  /**
   * Delete documents matching a Chroma metadata `where` filter.
   * Does not accept Mongo `deleteMany` semantics (empty filter / operators).
   *
   * @param filter - Chroma `where` metadata filter
   */
  async deleteDocuments(filter: Record<string, any>): Promise<void> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    const where = this.toChromaWhere(filter);

    try {
      await this.vectorStore.delete({ filter: where });

      this.logger.info(
        `Deleted documents from Chroma vector store matching where=${JSON.stringify(where)}`
      );
    } catch (error) {
      this.logAndThrow(
        "Failed to delete documents from vector store. Chroma uses a metadata `where` filter, not Mongo deleteMany",
        error
      );
    }
  }

  /**
   * Clear all documents by deleting the collection and recreating it empty
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      await this.vectorStore.ensureCollection();
      const client = this.vectorStore.index;
      if (!client) {
        throw new Error("Chroma client not initialized");
      }

      await client.deleteCollection({ name: this.collectionName });

      this.vectorStore = new Chroma(this.embeddings, {
        collectionName: this.collectionName,
        url: this.chromaUrl,
      });
      await this.vectorStore.ensureCollection();

      this.logger.info(
        `Cleared Chroma collection ${this.collectionName} and recreated it empty`
      );
    } catch (error) {
      this.logAndThrow("Failed to clear vector store", error);
    }
  }

  /**
   * Aggregated view of ingested sources (grouped by sourceId metadata)
   */
  async listSources(): Promise<
    Array<{
      sourceId: string;
      source: string;
      sourceType: string;
      chunkCount: number;
      ingestedAt: string;
    }>
  > {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      const collection = await this.vectorStore.ensureCollection();
      const bySource = new Map<
        string,
        {
          sourceId: string;
          source: string;
          sourceType: string;
          chunkCount: number;
          ingestedAt: string;
        }
      >();
      const pageSize = 500;
      let offset = 0;
      for (;;) {
        const page = await collection.get({
          include: ["metadatas"] as any,
          limit: pageSize,
          offset,
        });
        const metadatas = (page.metadatas ?? []) as Array<
          Record<string, any> | null
        >;
        for (const meta of metadatas) {
          if (!meta?.sourceId) continue; // pre-ingest chunks without sourceId are skipped
          const existing = bySource.get(meta.sourceId);
          if (existing) existing.chunkCount += 1;
          else
            bySource.set(meta.sourceId, {
              sourceId: String(meta.sourceId),
              source: String(meta.source ?? "unknown"),
              sourceType: String(meta.sourceType ?? "file"),
              chunkCount: 1,
              ingestedAt: String(meta.ingestedAt ?? ""),
            });
        }
        if (metadatas.length < pageSize) break;
        offset += pageSize;
      }
      return [...bySource.values()].sort((a, b) =>
        b.ingestedAt.localeCompare(a.ingestedAt)
      );
    } catch (error) {
      this.logAndThrow("Failed to list sources from Chroma vector store", error);
    }
  }

  /**
   * Map a port filter to a Chroma `where` clause.
   * Simple equality `{ field: value }` is allowed; empty / Mongo-style filters throw.
   */
  private toChromaWhere(filter: Record<string, any>): Where {
    if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
      throw new Error(
        "Chroma deleteDocuments requires a metadata where filter object; Mongo deleteMany filters are not supported."
      );
    }

    const keys = Object.keys(filter);
    if (keys.length === 0) {
      throw new Error(
        "Chroma deleteDocuments requires a non-empty metadata where filter; use clear() to remove all documents."
      );
    }

    const where: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" || key === "$or") {
        if (!Array.isArray(value)) {
          throw new Error(
            `Chroma cannot express metadata filter "${key}": expected an array. This is a Chroma where clause, not Mongo deleteMany.`
          );
        }
        where[key] = value;
        continue;
      }

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        where[key] = { $eq: value };
        continue;
      }

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        where[key] = value;
        continue;
      }

      throw new Error(
        `Chroma cannot express metadata filter field "${key}" (value type ${
          Array.isArray(value) ? "array" : typeof value
        }). Use a Chroma where clause, not Mongo deleteMany.`
      );
    }

    return where as Where;
  }

  private isConnectionRefused(error: unknown): boolean {
    const err = error as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
    const code = err?.code ?? err?.cause?.code;
    if (code === "ECONNREFUSED") {
      return true;
    }
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : typeof error === "string"
          ? error.toLowerCase()
          : "";
    return (
      message.includes("econnrefused") ||
      message.includes("connect econnrefused") ||
      message.includes("fetch failed")
    );
  }

  private logAndThrow(context: string, error: unknown): never {
    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : "Unknown Chroma error");
    if (this.isConnectionRefused(error)) {
      this.logger.error(
        `${context}: Chroma connection refused at CHROMA_URL=${this.chromaUrl}. Compose --profile rag is required to start Chroma.`,
        err
      );
    } else {
      this.logger.error(`${context}:`, err);
    }
    throw new Error(
      `${context}: ${err.message}`
    );
  }
}
