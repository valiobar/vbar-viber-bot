/**
 * Port interface for vector store operations
 * This is an outbound port that defines the contract for vector database interactions
 */
export interface VectorStorePort {
  /**
   * Add documents to the vector store
   * @param documents - Array of documents with content and optional metadata
   * @returns Promise that resolves when documents are added
   */
  addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, any> }>
  ): Promise<void>;

  /**
   * Search for similar documents using semantic similarity
   * @param query - The search query string
   * @param k - Number of similar documents to retrieve
   * @param threshold - Optional similarity threshold (0-1) to filter results
   * @returns Promise resolving to array of similar documents with scores and metadata
   */
  similaritySearch(
    query: string,
    k: number,
    threshold?: number
  ): Promise<
    Array<{
      content: string;
      score: number;
      metadata?: Record<string, any>;
    }>
  >;

  /**
   * Delete documents matching the filter criteria
   * @param filter - Filter object to match documents for deletion
   * @returns Promise that resolves when documents are deleted
   */
  deleteDocuments(filter: Record<string, any>): Promise<void>;

  /**
   * Clear all documents from the vector store
   * @returns Promise that resolves when all documents are cleared
   */
  clear(): Promise<void>;

  /**
   * Aggregated view of ingested sources (grouped by sourceId metadata)
   */
  listSources(): Promise<
    Array<{
      sourceId: string;
      source: string;
      sourceType: string;
      chunkCount: number;
      ingestedAt: string;
    }>
  >;
}
