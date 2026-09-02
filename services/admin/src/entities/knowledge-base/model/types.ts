export interface IngestResultItem {
  source: string;
  status: "success" | "error";
  chunks?: number;
  sourceId?: string;
  error?: string;
}

export interface IngestResult {
  items: IngestResultItem[];
  totalChunks: number;
}

export interface KnowledgeSource {
  sourceId: string;
  source: string;
  sourceType: string;
  chunkCount: number;
  ingestedAt: string;
}
