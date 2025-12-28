"use client";

/**
 * TextMessageFields Component
 *
 * Form fields for text message type
 */

interface TextMessageFieldsProps {
  /**
   * Current text content value
   */
  value: string;

  /**
   * Callback when text content changes
   */
  onChange: (value: string) => void;

  /**
   * Validation error message (optional)
   */
  error?: string;
}

export const TextMessageFields = ({
  value,
  onChange,
  error,
}: TextMessageFieldsProps) => {
  return (
    <div>
      <label
        htmlFor="textContent"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Text <span className="text-red-500">*</span>
      </label>
      <textarea
        id="textContent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
        placeholder="Enter message text"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
