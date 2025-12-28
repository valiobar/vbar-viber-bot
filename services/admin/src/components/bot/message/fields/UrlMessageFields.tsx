"use client";

/**
 * UrlMessageFields Component
 *
 * Form fields for URL message type
 */

interface UrlMessageFieldsProps {
  /**
   * Current URL value
   */
  value: string | null;

  /**
   * Callback when URL changes
   */
  onChange: (value: string) => void;

  /**
   * Validation error message (optional)
   */
  error?: string;
}

export const UrlMessageFields = ({
  value,
  onChange,
  error,
}: UrlMessageFieldsProps) => {
  return (
    <div>
      <label
        htmlFor="url"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        URL <span className="text-red-500">*</span>
      </label>
      <input
        type="url"
        id="url"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
        placeholder="https://example.com"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
