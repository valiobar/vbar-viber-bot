/**
 * Port interface for knowledge-base ingest
 * This is an inbound port (use case) that defines the AI↔admin contract.
 * Admin mirrors these types in its entity model; they are not added to @vbar/shared.
 */

export interface IngestResultItem {
  source: string; // filename or URL
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
  sourceType: string; // "file" | "url"
  chunkCount: number;
  ingestedAt: string; // ISO date
}

export interface IngestFileInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface IngestKnowledgeUseCase {
  ingestFiles(files: IngestFileInput[]): Promise<IngestResult>;
  ingestUrls(urls: string[]): Promise<IngestResult>;
  listSources(): Promise<KnowledgeSource[]>;
  deleteSource(sourceId: string): Promise<void>;
  clearAll(): Promise<void>;
}
