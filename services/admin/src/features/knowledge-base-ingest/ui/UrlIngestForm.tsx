"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ingestUrls, type IngestResult } from "@/entities/knowledge-base";
import { HttpError } from "@/shared";

const MAX_URLS = 20;

type UrlIngestFormProps = {
  onIngested: (result: IngestResult) => void;
  disabled?: boolean;
};

export const UrlIngestForm = ({
  onIngested,
  disabled = false,
}: UrlIngestFormProps) => {
  const [text, setText] = useState("");
  const [result, setResult] = useState<IngestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urls = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const tooMany = urls.length > MAX_URLS;
  const invalid = urls.some((url) => !/^https?:\/\//.test(url));

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ingestResult = await ingestUrls(urls);
      setResult(ingestResult);
      setText("");
      onIngested(ingestResult);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Ingest failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="url-ingest-form"
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Ingest from URLs
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        One http(s) URL per line. Up to {MAX_URLS} URLs per request.
      </p>

      <div>
        <label
          htmlFor="knowledge-base-urls"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          URLs
        </label>
        <textarea
          id="knowledge-base-urls"
          value={text}
          onChange={handleChange}
          placeholder={"https://example.com/page\nhttps://example.com/other"}
          aria-label="URLs to ingest, one per line"
          data-testid="url-ingest-textarea"
          disabled={disabled || submitting}
          rows={6}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
        />
        <span
          className={`mt-1 block text-sm ${
            tooMany
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {urls.length} / {MAX_URLS} URLs
        </span>
      </div>

      {invalid && urls.length > 0 && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Each URL must start with http:// or https://
        </p>
      )}

      <button
        type="submit"
        data-testid="url-ingest-submit"
        aria-label="Ingest URLs"
        disabled={
          disabled ||
          submitting ||
          urls.length === 0 ||
          tooMany ||
          invalid
        }
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-800"
      >
        {submitting ? "Processing… this can take a minute" : "Ingest URLs"}
      </button>

      {result && result.items.length > 0 && (
        <div className="space-y-1" aria-live="polite">
          {result.items.map((item) => (
            <p
              key={item.source}
              data-testid="ingest-result-row"
              className={
                item.status === "success"
                  ? "text-sm text-green-600 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {item.source}:{" "}
              {item.status === "success"
                ? `${item.chunks} chunks`
                : item.error}
            </p>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};
