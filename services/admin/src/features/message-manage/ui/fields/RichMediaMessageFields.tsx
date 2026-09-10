"use client";

/**
 * RichMediaMessageFields Component
 *
 * Form fields for rich-media message type (carousel picker)
 */

import type { CarouselDTO } from "@/entities/carousel";

interface RichMediaMessageFieldsProps {
  /**
   * Current carousel ID value
   */
  carouselId: string | null;

  /**
   * List of available carousels
   */
  carousels: CarouselDTO[];

  /**
   * Whether carousels are loading
   */
  isLoading: boolean;

  /**
   * Callback when carousel selection changes
   */
  onChange: (value: string | null) => void;

  /**
   * Validation error message (optional)
   */
  error?: string;
}

export const RichMediaMessageFields = ({
  carouselId,
  carousels,
  isLoading,
  onChange,
  error,
}: RichMediaMessageFieldsProps) => {
  return (
    <div>
      <label
        htmlFor="carouselId"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Carousel <span className="text-red-500">*</span>
      </label>
      {isLoading ? (
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Loading carousels...
        </div>
      ) : (
        <select
          id="carouselId"
          value={carouselId || ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            error
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          <option value="">Select a carousel</option>
          {carousels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.humanReadableName}
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
