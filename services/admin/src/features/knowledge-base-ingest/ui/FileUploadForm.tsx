"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ingestFiles, type IngestResult } from "@/entities/knowledge-base";
import { HttpError } from "@/shared";

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;
const ACCEPT = ".pdf,.md,.txt,text/plain,application/pdf";

type FileUploadFormProps = {
  onIngested: (result: IngestResult) => void;
  disabled?: boolean;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUploadForm = ({
  onIngested,
  disabled = false,
}: FileUploadFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let validationError: string | null = null;
  if (files.length > MAX_FILES) {
    validationError = `Max ${MAX_FILES} files`;
  } else if (files.some((file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024)) {
    validationError = `Each file must be ≤ ${MAX_FILE_SIZE_MB} MB`;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles([...(event.target.files ?? [])]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ingestResult = await ingestFiles(files);
      setResult(ingestResult);
      setFiles([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onIngested(ingestResult);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="file-upload-form"
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Upload files
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        PDF, Markdown, or plain text. Up to {MAX_FILES} files,{" "}
        {MAX_FILE_SIZE_MB} MB each.
      </p>

      <div>
        <label
          htmlFor="knowledge-base-files"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Select files
        </label>
        <input
          ref={inputRef}
          id="knowledge-base-files"
          type="file"
          multiple
          accept={ACCEPT}
          aria-label="Select files"
          data-testid="file-upload-input"
          onChange={handleChange}
          disabled={disabled || submitting}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 dark:text-gray-300 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800"
        />
      </div>

      {files.length > 0 && (
        <ul
          className="space-y-1 text-sm text-gray-700 dark:text-gray-300"
          aria-label="Selected files"
        >
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`}>
              {file.name}{" "}
              <span className="text-gray-500 dark:text-gray-400">
                ({formatFileSize(file.size)})
              </span>
            </li>
          ))}
        </ul>
      )}

      {validationError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        data-testid="file-upload-submit"
        aria-label="Upload files"
        disabled={
          disabled || submitting || files.length === 0 || !!validationError
        }
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-800"
      >
        {submitting ? "Processing… this can take a minute" : "Upload"}
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
