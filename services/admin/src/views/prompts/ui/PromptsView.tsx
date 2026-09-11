"use client";

import { useCallback, useEffect, useState } from "react";
import { PromptForm } from "@/features/prompt-manage";
import { PromptsList } from "@/widgets/prompt-list";
import {
  listPrompts,
  updatePrompt,
  deletePrompt,
  type PromptDTO,
} from "@/entities/prompt";
import { HttpError } from "@/shared";

export const PromptsView = () => {
  const [prompts, setPrompts] = useState<PromptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromptDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [unreachable, setUnreachable] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      setPrompts(await listPrompts());
      setNotConfigured(false);
      setUnreachable(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 503) {
        setNotConfigured(true);
      } else if (err instanceof HttpError && err.status === 502) {
        setUnreachable(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrompts();
  }, [fetchPrompts]);

  const handleActivate = async (prompt: PromptDTO) => {
    await updatePrompt(prompt.name, { isActive: true });
    await fetchPrompts();
  };

  const handleDelete = async (name: string) => {
    await deletePrompt(name);
    await fetchPrompts();
  };

  const handleSaved = async () => {
    setEditing(null);
    setCreating(false);
    await fetchPrompts();
  };

  const handleCreate = () => {
    setEditing(null);
    setCreating(true);
  };

  const handleEdit = (prompt: PromptDTO) => {
    setCreating(false);
    setEditing(prompt);
  };

  const handleCancel = () => {
    setEditing(null);
    setCreating(false);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Prompts
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Prompts used by the AI service for simple and RAG chains
          </p>
        </div>
        {!creating && !editing && (
          <button
            type="button"
            onClick={handleCreate}
            aria-label="Create prompt"
            data-testid="prompt-create"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Create Prompt
          </button>
        )}
      </div>

      {notConfigured && (
        <div
          data-testid="prompts-not-configured-banner"
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
        >
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Prompts are not configured on the AI service (set AI_SERVICE_TOKEN)
          </p>
          <button
            type="button"
            onClick={() => {
              void fetchPrompts();
            }}
            aria-label="Retry loading prompts"
            data-testid="retry-prompts"
            className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:bg-yellow-700 dark:hover:bg-yellow-800"
          >
            Retry
          </button>
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
              void fetchPrompts();
            }}
            aria-label="Retry loading prompts"
            data-testid="retry-prompts"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {(creating || editing) && (
        <div className="mb-8">
          <PromptForm
            initialData={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      )}

      <PromptsList
        prompts={prompts}
        loading={loading}
        onEdit={handleEdit}
        onActivate={handleActivate}
        onDelete={handleDelete}
      />
    </div>
  );
};
