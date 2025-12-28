"use client";

/**
 * StepForm Component
 *
 * Form for creating/editing Steps with trigger strings, message selection,
 * and optional keyboard assignment.
 */

import { useState, useEffect } from "react";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";
import type { CreateStepInput } from "@/domains/step/ports/in/CreateStepUseCase";
import type { UpdateStepInput } from "@/domains/step/ports/in/UpdateStepUseCase";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";
import type { ListMessagesResult } from "@/domains/message/ports/in/ListMessagesUseCase";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";
import type { ListKeyboardsResult } from "@/domains/keyboard/ports/in/ListKeyboardsUseCase";
import type { ApiResponse } from "@vbar/shared";

interface StepFormProps {
  /**
   * Initial step data for editing (optional)
   * If not provided, form is in create mode
   */
  initialData?: StepDTO;

  /**
   * Callback when form is submitted
   */
  onSubmit: (data: CreateStepInput | UpdateStepInput) => Promise<void>;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether form is in loading state
   */
  isLoading?: boolean;
}

const StepForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: StepFormProps) => {
  // Form state
  const [humanReadableName, setHumanReadableName] = useState("");
  const [triggers, setTriggers] = useState<string[]>([""]);
  const [content, setContent] = useState<string[]>([]);
  const [keyboard, setKeyboard] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [keyboards, setKeyboards] = useState<KeyboardDTO[]>([]);
  const [isLoadingKeyboards, setIsLoadingKeyboards] = useState(false);

  /**
   * Fetch messages for content selection
   */
  useEffect(() => {
    setIsLoadingMessages(true);
    fetch("/api/messages?limit=1000&hidden=false")
      .then((res) => res.json())
      .then((data: ApiResponse<ListMessagesResult>) => {
        if (data.data) {
          setMessages(data.data.messages);
        }
      })
      .catch((err) => {
        console.error("Error fetching messages:", err);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, []);

  /**
   * Fetch keyboards for keyboard selection
   */
  useEffect(() => {
    setIsLoadingKeyboards(true);
    fetch("/api/keyboards?limit=1000&hidden=false")
      .then((res) => res.json())
      .then((data: ApiResponse<ListKeyboardsResult>) => {
        if (data.data) {
          setKeyboards(data.data.keyboards);
        }
      })
      .catch((err) => {
        console.error("Error fetching keyboards:", err);
      })
      .finally(() => {
        setIsLoadingKeyboards(false);
      });
  }, []);

  /**
   * Initialize form with initial data
   */
  useEffect(() => {
    if (initialData) {
      setHumanReadableName(initialData.humanReadableName);
      setTriggers(initialData.trigger.length > 0 ? initialData.trigger : [""]);
      setContent(initialData.content);
      setKeyboard(initialData.keyboard);
      setHidden(initialData.hidden);
    }
  }, [initialData]);

  /**
   * Add a new trigger input
   */
  const addTrigger = () => {
    setTriggers([...triggers, ""]);
  };

  /**
   * Remove a trigger input
   */
  const removeTrigger = (index: number) => {
    if (triggers.length > 1) {
      const newTriggers = triggers.filter((_, i) => i !== index);
      setTriggers(newTriggers);
    }
  };

  /**
   * Update a trigger value
   */
  const updateTrigger = (index: number, value: string) => {
    const newTriggers = [...triggers];
    newTriggers[index] = value;
    setTriggers(newTriggers);
  };

  /**
   * Toggle message selection in content array
   */
  const toggleMessage = (messageId: string) => {
    if (content.includes(messageId)) {
      setContent(content.filter((id) => id !== messageId));
    } else {
      setContent([...content, messageId]);
    }
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate humanReadableName
    if (!humanReadableName.trim()) {
      newErrors.humanReadableName = "Name is required";
    } else if (humanReadableName.trim().length > 100) {
      newErrors.humanReadableName = "Name must be 100 characters or less";
    }

    // Validate triggers (at least one non-empty)
    const validTriggers = triggers
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (validTriggers.length === 0) {
      newErrors.triggers = "At least one trigger is required";
    }

    // Check for duplicate triggers (case-insensitive)
    const lowerTriggers = validTriggers.map((t) => t.toLowerCase());
    const uniqueTriggers = new Set(lowerTriggers);
    if (uniqueTriggers.size !== validTriggers.length) {
      newErrors.triggers = "Trigger strings must be unique";
    }

    // Validate content (at least one message)
    if (content.length === 0) {
      newErrors.content = "At least one message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Build valid triggers array (non-empty, trimmed)
    const validTriggers = triggers
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (initialData) {
      // Update mode
      const updateData: UpdateStepInput = {
        humanReadableName: humanReadableName.trim(),
        trigger: validTriggers,
        content,
        keyboard: keyboard || null,
        hidden,
      };
      await onSubmit(updateData);
    } else {
      // Create mode
      const createData: CreateStepInput = {
        humanReadableName: humanReadableName.trim(),
        trigger: validTriggers,
        content,
        keyboard: keyboard || null,
        hidden,
      };
      await onSubmit(createData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Step Information
        </h2>

        <div className="space-y-4">
          {/* Human Readable Name */}
          <div>
            <label
              htmlFor="humanReadableName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="humanReadableName"
              value={humanReadableName}
              onChange={(e) => setHumanReadableName(e.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.humanReadableName
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Enter step name"
              maxLength={100}
            />
            {errors.humanReadableName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.humanReadableName}
              </p>
            )}
          </div>

          {/* Hidden Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hidden"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
            />
            <label
              htmlFor="hidden"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Hidden
            </label>
          </div>
        </div>
      </div>

      {/* Triggers */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Triggers
        </h2>

        <div className="space-y-3">
          {triggers.map((trigger, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={trigger}
                onChange={(e) => updateTrigger(index, e.target.value)}
                className={`flex-1 rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.triggers
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder={`Trigger ${index + 1}`}
              />
              {triggers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTrigger(index)}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTrigger}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            + Add Trigger
          </button>
          {errors.triggers && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.triggers}
            </p>
          )}
        </div>
      </div>

      {/* Content (Messages) */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Messages <span className="text-red-500">*</span>
        </h2>

        {isLoadingMessages ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading messages...
          </div>
        ) : (
          <div className="space-y-2">
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3 dark:border-gray-600">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No messages available
                </p>
              ) : (
                messages.map((message) => (
                  <label
                    key={message.id}
                    className="flex items-center space-x-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={content.includes(message.id)}
                      onChange={() => toggleMessage(message.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {message.humanReadableName}
                    </span>
                  </label>
                ))
              )}
            </div>
            {errors.content && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.content}
              </p>
            )}
            {content.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {content.length} message{content.length !== 1 ? "s" : ""}{" "}
                selected
              </p>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Keyboard (Optional)
        </h2>

        {isLoadingKeyboards ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading keyboards...
          </div>
        ) : (
          <select
            id="keyboard"
            value={keyboard || ""}
            onChange={(e) => setKeyboard(e.target.value || null)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">No keyboard</option>
            {keyboards.map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.humanReadableName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : initialData
            ? "Update Step"
            : "Create Step"}
        </button>
      </div>
    </form>
  );
};

export default StepForm;
