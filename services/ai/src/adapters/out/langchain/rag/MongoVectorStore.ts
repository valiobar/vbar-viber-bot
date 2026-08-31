/**
 * MongoDB Vector Store Adapter
 *
 * Implements VectorStorePort using MongoDB Atlas Vector Search.
 * Stores document embeddings in MongoDB for semantic search.
 */

import { VectorStorePort } from "../../../../ports/out/VectorStorePort";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { Embeddings } from "@langchain/core/embeddings";
import { getDatabase } from "../../../../config/database";
import { Logger } from "@vbar/shared";
import { Document } from "@langchain/core/documents";

/**
 * MongoDB Vector Store implementation
 *
 * Uses MongoDB Atlas Vector Search for persistent vector storage.
 * Requires MongoDB Atlas with vector search index configured.
 */
export class MongoVectorStore implements VectorStorePort {
  private vectorStore: MongoDBAtlasVectorSearch | null = null;
  private embeddings: Embeddings;
  private collectionName: string;
  private logger: Logger;
  private initPromise: Promise<void> | null = null;

  /**
   * Constructor
   *
   * @param embeddings - Embeddings instance for generating vector embeddings
   * @param collectionName - MongoDB collection name for storing vectors
   * @param logger - Logger instance for logging
   */
  constructor(embeddings: Embeddings, collectionName: string, logger: Logger) {
    this.embeddings = embeddings;
    this.collectionName = collectionName;
    this.logger = logger;

    // Initialize MongoDB vector store in constructor (async, but started here)
    this.initPromise = this.initialize();
  }

  /**
   * Initialize MongoDB vector store
   * Must be called before using the vector store
   */
  private async initialize(): Promise<void> {
    if (this.vectorStore) {
      return; // Already initialized
    }

    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }
      const collection = db.collection(this.collectionName);

      this.logger.info(
        `Initializing MongoDB vector store with collection: ${this.collectionName}`
      );

      this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
        collection: collection as any, // Type compatibility issue between mongoose and mongodb packages
        indexName: "vector_index", // Default index name, should match MongoDB Atlas index
      });

      this.logger.info("MongoDB vector store initialized successfully");
    } catch (error) {
      this.logger.error(
        "Failed to initialize MongoDB vector store:",
        error as Error
      );
      throw new Error(
        `Failed to initialize MongoDB vector store: ${
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
        `Added ${documents.length} documents to MongoDB vector store`
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
   * Delete documents matching the filter criteria
   *
   * @param filter - Filter object to match documents for deletion
   */
  async deleteDocuments(filter: Record<string, any>): Promise<void> {
    await this.ensureInitialized();

    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }
      const collection = db.collection(this.collectionName);

      const result = await collection.deleteMany(filter);

      this.logger.info(
        `Deleted ${result.deletedCount} documents from MongoDB vector store`
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
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }
      const collection = db.collection(this.collectionName);

      const result = await collection.deleteMany({});

      this.logger.info(
        `Cleared ${result.deletedCount} documents from MongoDB vector store`
      );
    } catch (error) {
      this.logger.error("Failed to clear vector store:", error as Error);
      throw new Error(
        `Failed to clear vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
