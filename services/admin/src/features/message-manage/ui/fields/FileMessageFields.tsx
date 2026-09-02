"use client";

/**
 * FileMessageFields Component
 *
 * Form fields for file message type
 */

interface FileMessageFieldsProps {
  /**
   * Current media URL value
   */
  media: string;

  /**
   * Current size value in bytes (optional)
   */
  size: number | null;

  /**
   * Current file name value (optional)
   */
  fileName: string;

  /**
   * Callback when media URL changes
   */
  onMediaChange: (value: string) => void;

  /**
   * Callback when size changes
   */
  onSizeChange: (value: number | null) => void;

  /**
   * Callback when file name changes
   */
  onFileNameChange: (value: string) => void;

  /**
   * Validation error messages
   */
  errors?: {
    fileMedia?: string;
  };
}

export const FileMessageFields = ({
  media,
  size,
  fileName,
  onMediaChange,
  onSizeChange,
  onFileNameChange,
  errors,
}: FileMessageFieldsProps) => {
  return (
    <>
      <div>
        <label
          htmlFor="fileMedia"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Media URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="fileMedia"
          value={media}
          onChange={(e) => onMediaChange(e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.fileMedia
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="https://example.com/file.pdf"
        />
        {errors?.fileMedia && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.fileMedia}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="fileSize"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Size in bytes (optional)
          </label>
          <input
            type="number"
            id="fileSize"
            value={size || ""}
            onChange={(e) =>
              onSizeChange(
                e.target.value ? parseInt(e.target.value, 10) : null
              )
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="0"
          />
        </div>
        <div>
          <label
            htmlFor="fileName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            File Name (optional)
          </label>
          <input
            type="text"
            id="fileName"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="document.pdf"
          />
        </div>
      </div>
    </>
  );
};

