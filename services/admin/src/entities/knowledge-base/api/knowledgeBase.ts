import { http } from "@/shared";
import type { IngestResult, KnowledgeSource } from "../model/types";

export const ingestFiles = (files: File[]): Promise<IngestResult> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return http<IngestResult>("/api/knowledge-base/files", {
    method: "POST",
    body: formData,
  });
};

export const ingestUrls = (urls: string[]): Promise<IngestResult> =>
  http<IngestResult>("/api/knowledge-base/urls", {
    method: "POST",
    body: { urls },
  });

export const listSources = (): Promise<KnowledgeSource[]> =>
  http<KnowledgeSource[]>("/api/knowledge-base/sources");

export const deleteSource = (id: string): Promise<{ deleted: boolean }> =>
  http<{ deleted: boolean }>(
    `/api/knowledge-base/sources/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

export const clearAllSources = (): Promise<{ cleared: boolean }> =>
  http<{ cleared: boolean }>("/api/knowledge-base/sources", {
    method: "DELETE",
  });
