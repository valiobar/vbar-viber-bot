/**
 * Memory Vector Store Adapter
 *
 * Implements VectorStorePort using in-memory vector store.
 * Useful for development and testing, but not persistent.
 */

import { VectorStorePort } from "../../../../ports/out/VectorStorePort";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";
import { Logger } from "@vbar/shared";
import { Document } from "@langchain/core/documents";

/**
 * Memory Vector Store implementation
 *
 * Uses LangChain's in-memory vector store for non-persistent storage.
 * All data is lost when the service restarts.
 */
export class MemoryVectorStoreAdapter implements VectorStorePort {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: Embeddings;
  private logger: Logger;
  private initPromise: Promise<void> | null = null;

  /**
   * Constructor
   *
   * @param embeddings - Embeddings instance for generating vector embeddings
   * @param logger - Logger instance for logging
   */
  constructor(embeddings: Embeddings, logger: Logger) {
    this.embeddings = embeddings;
    this.logger = logger;
    // Initialize in-memory vector store in constructor (async, but started here)
    this.initPromise = this.initialize();
  }

  /**
   * Initialize in-memory vector store
   * Must be called before using the vector store
   */
  private async initialize(): Promise<void> {
    if (this.vectorStore) {
      return; // Already initialized
    }

    try {
      this.logger.info("Initializing in-memory vector store");

      this.vectorStore = await MemoryVectorStore.fromDocuments(
        [], // Start with empty documents
        this.embeddings
      );

      this.logger.info("In-memory vector store initialized successfully");
    } catch (error) {
      this.logger.error(
        "Failed to initialize in-memory vector store:",
        error as Error
      );
      throw new Error(
        `Failed to initialize in-memory vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
        `Added ${documents.length} documents to in-memory vector store`
      );
    } catch (error) {
      this.logger.error(
        "Failed to add documents to vector store:",
        error as Error
      );
      throw new Error(
        `Failed to add documents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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

      // Filter by threshold if provided
      const filteredResults = threshold
        ? results.filter(([, score]) => score >= threshold)
        : results;

      return filteredResults.map(([doc, score]) => ({
        content: doc.pageContent,
        score: score as number,
        metadata: doc.metadata,
      }));
    } catch (error) {
      this.logger.error("Failed to search vector store:", error as Error);
      throw new Error(
        `Failed to search vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete documents matching a simple equality filter on metadata.
   *
   * @param filter - Metadata equality filter (all keys must match)
   */
  async deleteDocuments(filter: Record<string, any>): Promise<void> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      const entries = Object.entries(filter);
      if (entries.length === 0) {
        throw new Error(
          "deleteDocuments requires a non-empty filter; use clear() to remove all documents."
        );
      }
      const before = this.vectorStore.memoryVectors.length;
      this.vectorStore.memoryVectors = this.vectorStore.memoryVectors.filter(
        (vec) => !entries.every(([key, value]) => vec.metadata?.[key] === value)
      );
      this.logger.info(
        `Deleted ${before - this.vectorStore.memoryVectors.length} documents from in-memory vector store`
      );
    } catch (error) {
      this.logger.error(
        "Failed to delete documents from vector store:",
        error as Error
      );
      throw new Error(
        `Failed to delete documents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clear all documents from the vector store
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      // Reinitialize with empty documents to clear the store
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        [],
        this.embeddings
      );

      this.logger.info("Cleared all documents from in-memory vector store");
    } catch (error) {
      this.logger.error("Failed to clear vector store:", error as Error);
      throw new Error(
        `Failed to clear vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
    for (const vec of this.vectorStore.memoryVectors) {
      const meta = vec.metadata as Record<string, any> | undefined;
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
    return [...bySource.values()].sort((a, b) =>
      b.ingestedAt.localeCompare(a.ingestedAt)
    );
  }
}
