"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileUploadForm,
  UrlIngestForm,
} from "@/features/knowledge-base-ingest";
import { SourcesTable } from "@/widgets/knowledge-base-sources";
import {
  listSources,
  deleteSource,
  clearAllSources,
  type KnowledgeSource,
} from "@/entities/knowledge-base";
import { HttpError } from "@/shared";

export const KnowledgeBaseView = () => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [ragDisabled, setRagDisabled] = useState(false);
  const [unreachable, setUnreachable] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      setSources(await listSources());
      setRagDisabled(false);
      setUnreachable(false);
    } catch (err) {
      if (
        err instanceof HttpError &&
        err.status === 503 &&
        err.code === "RAG_DISABLED"
      ) {
        setRagDisabled(true);
      } else if (err instanceof HttpError && err.status === 502) {
        setUnreachable(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSources();
  }, [fetchSources]);

  const handleDelete = async (id: string) => {
    await deleteSource(id);
    await fetchSources();
  };

  const handleClearAll = async () => {
    await clearAllSources();
    await fetchSources();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Knowledge Base
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Upload files or ingest URLs for RAG retrieval
        </p>
      </div>

      {ragDisabled && (
        <div
          data-testid="rag-disabled-banner"
          role="alert"
          className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
        >
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            RAG is disabled on the AI service (set RAG_ENABLED=true)
          </p>
        </div>
      )}

      {unreachable && (
        <div
          data-testid="ai-unreachable-banner"
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
        >
          <p className="text-sm text-red-600 dark:text-red-300">
            AI service unreachable
          </p>
          <button
            type="button"
            onClick={() => {
              void fetchSources();
            }}
            aria-label="Retry loading sources"
            data-testid="retry-sources"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <FileUploadForm onIngested={fetchSources} disabled={ragDisabled} />
        <UrlIngestForm onIngested={fetchSources} disabled={ragDisabled} />
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Ingested sources
      </h2>
      <SourcesTable
        sources={sources}
        loading={loading}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </div>
  );
};
