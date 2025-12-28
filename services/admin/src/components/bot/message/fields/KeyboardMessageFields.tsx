"use client";

/**
 * KeyboardMessageFields Component
 *
 * Form fields for keyboard message type
 */

import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";

interface KeyboardMessageFieldsProps {
  /**
   * Current keyboard ID value
   */
  keyboardId: string | null;

  /**
   * List of available keyboards
   */
  keyboards: KeyboardDTO[];

  /**
   * Whether keyboards are loading
   */
  isLoading: boolean;

  /**
   * Callback when keyboard selection changes
   */
  onChange: (value: string | null) => void;

  /**
   * Validation error message (optional)
   */
  error?: string;
}

export const KeyboardMessageFields = ({
  keyboardId,
  keyboards,
  isLoading,
  onChange,
  error,
}: KeyboardMessageFieldsProps) => {
  return (
    <div>
      <label
        htmlFor="keyboardId"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Keyboard <span className="text-red-500">*</span>
      </label>
      {isLoading ? (
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Loading keyboards...
        </div>
      ) : (
        <select
          id="keyboardId"
          value={keyboardId || ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            error
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          <option value="">Select a keyboard</option>
          {keyboards.map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.humanReadableName}
            </option>
          ))}
        </select>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

