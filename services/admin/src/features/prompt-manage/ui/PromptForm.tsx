"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createPrompt,
  updatePrompt,
  type PromptDTO,
  type PromptTaskType,
} from "@/entities/prompt";
import { HttpError } from "@/shared";

type PromptFormProps = {
  initialData?: PromptDTO;
  onSaved: () => void;
  onCancel?: () => void;
};

const TASK_TYPES: PromptTaskType[] = ["simple", "rag", "custom"];

const inputClass = (hasError: boolean) =>
  `mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400 ${
    hasError
      ? "border-red-500"
      : "border-gray-300 dark:border-gray-600"
  }`;

export const PromptForm = ({
  initialData,
  onSaved,
  onCancel,
}: PromptFormProps) => {
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState<PromptTaskType>("simple");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name);
    setTaskType(initialData.taskType);
    setDescription(initialData.description ?? "");
    setTemplate(initialData.template);
    setIsActive(initialData.isActive);
  }, [initialData]);

  // Mirrors ManagePromptsUseCaseImpl.assertTemplateShape
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!initialData && !/^[a-zA-Z0-9_-]{1,64}$/.test(name.trim())) {
      next.name = "Use 1-64 letters, digits, _ or -";
    }
    if (!template.trim()) {
      next.template = "Template content is required";
    } else if (taskType === "simple" && template.includes("{")) {
      next.template = "A simple prompt cannot contain { } placeholders";
    } else if (taskType === "rag") {
      if (!template.includes("{context}") || !template.includes("{question}")) {
        next.template = "A rag prompt must include {context} and {question}";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (initialData) {
        await updatePrompt(initialData.name, {
          template,
          taskType,
          description: description || undefined,
          isActive,
        });
      } else {
        await createPrompt({
          name: name.trim(),
          template,
          taskType,
          description: description || undefined,
          isActive,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  let submitLabel = "Create Prompt";
  if (submitting) {
    submitLabel = "Saving...";
  } else if (initialData) {
    submitLabel = "Update Prompt";
  }

  const handleTaskTypeChange = (value: PromptTaskType) => {
    setTaskType(value);
    if (errors.template) {
      setErrors((current) => {
        const next = { ...current };
        delete next.template;
        return next;
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="prompt-form"
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {initialData ? "Edit Prompt" : "Create Prompt"}
      </h2>

      <div>
        <label
          htmlFor="prompt-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="prompt-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={Boolean(initialData) || submitting}
          maxLength={64}
          placeholder="e.g. welcome_simple"
          aria-label="Prompt name"
          data-testid="prompt-form-name"
          className={inputClass(Boolean(errors.name))}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="prompt-task-type"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Task type <span className="text-red-500">*</span>
        </label>
        <select
          id="prompt-task-type"
          value={taskType}
          onChange={(event) =>
            handleTaskTypeChange(event.target.value as PromptTaskType)
          }
          disabled={submitting}
          aria-label="Prompt task type"
          data-testid="prompt-form-task-type"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
        >
          {TASK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="prompt-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description
        </label>
        <input
          type="text"
          id="prompt-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={submitting}
          placeholder="Optional short description"
          aria-label="Prompt description"
          data-testid="prompt-form-description"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
        />
      </div>

      <div>
        <label
          htmlFor="prompt-template"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Template <span className="text-red-500">*</span>
        </label>
        <textarea
          id="prompt-template"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          disabled={submitting}
          rows={12}
          placeholder={
            taskType === "rag"
              ? "Use {context} for retrieved documents and {question} for the user message."
              : "Prompt text sent to the model"
          }
          aria-label="Prompt template"
          data-testid="prompt-form-template"
          className={`${inputClass(Boolean(errors.template))} font-mono`}
        />
        {taskType === "rag" && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Use {"{context}"} for retrieved documents and {"{question}"} for the
            user message.
          </p>
        )}
        {errors.template && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.template}
          </p>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="prompt-active"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={submitting}
          aria-label="Active prompt"
          data-testid="prompt-form-active"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
        />
        <label
          htmlFor="prompt-active"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          Active
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cancel prompt form"
            data-testid="prompt-form-cancel"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          aria-label={initialData ? "Update prompt" : "Create prompt"}
          data-testid="prompt-form-submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
