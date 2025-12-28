"use client";

/**
 * StickerMessageFields Component
 *
 * Form fields for sticker message type
 */

interface StickerMessageFieldsProps {
  /**
   * Current sticker ID value
   */
  stickerId: number | null;

  /**
   * Callback when sticker ID changes
   */
  onChange: (value: number | null) => void;

  /**
   * Validation error message (optional)
   */
  error?: string;
}

export const StickerMessageFields = ({
  stickerId,
  onChange,
  error,
}: StickerMessageFieldsProps) => {
  return (
    <div>
      <label
        htmlFor="stickerId"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Sticker ID <span className="text-red-500">*</span>
      </label>
      <input
        type="number"
        id="stickerId"
        value={stickerId || ""}
        onChange={(e) =>
          onChange(
            e.target.value ? parseInt(e.target.value, 10) : null
          )
        }
        className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
          error
            ? "border-red-500"
            : "border-gray-300 dark:border-gray-600"
        }`}
        placeholder="12345"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

