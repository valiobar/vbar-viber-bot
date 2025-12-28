"use client";

/**
 * VideoMessageFields Component
 *
 * Form fields for video message type
 */

interface VideoMessageFieldsProps {
  /**
   * Current media URL value
   */
  media: string;

  /**
   * Current text value (optional)
   */
  text: string;

  /**
   * Current thumbnail URL value (optional)
   */
  thumbnail: string;

  /**
   * Current size value in bytes (optional)
   */
  size: number | null;

  /**
   * Current duration value in seconds (optional)
   */
  duration: number | null;

  /**
   * Callback when media URL changes
   */
  onMediaChange: (value: string) => void;

  /**
   * Callback when text changes
   */
  onTextChange: (value: string) => void;

  /**
   * Callback when thumbnail URL changes
   */
  onThumbnailChange: (value: string) => void;

  /**
   * Callback when size changes
   */
  onSizeChange: (value: number | null) => void;

  /**
   * Callback when duration changes
   */
  onDurationChange: (value: number | null) => void;

  /**
   * Validation error messages
   */
  errors?: {
    videoMedia?: string;
  };
}

export const VideoMessageFields = ({
  media,
  text,
  thumbnail,
  size,
  duration,
  onMediaChange,
  onTextChange,
  onThumbnailChange,
  onSizeChange,
  onDurationChange,
  errors,
}: VideoMessageFieldsProps) => {
  return (
    <>
      <div>
        <label
          htmlFor="videoMedia"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Media URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="videoMedia"
          value={media}
          onChange={(e) => onMediaChange(e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.videoMedia
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="https://example.com/video.mp4"
        />
        {errors?.videoMedia && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.videoMedia}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="videoText"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Text (optional)
        </label>
        <textarea
          id="videoText"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Optional text"
        />
      </div>
      <div>
        <label
          htmlFor="videoThumbnail"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Thumbnail URL (optional)
        </label>
        <input
          type="url"
          id="videoThumbnail"
          value={thumbnail}
          onChange={(e) => onThumbnailChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="https://example.com/thumb.jpg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="videoSize"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Size in bytes (optional)
          </label>
          <input
            type="number"
            id="videoSize"
            value={size || ""}
            onChange={(e) =>
              onSizeChange(e.target.value ? parseInt(e.target.value, 10) : null)
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="0"
          />
        </div>
        <div>
          <label
            htmlFor="videoDuration"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Duration in seconds (optional)
          </label>
          <input
            type="number"
            id="videoDuration"
            value={duration || ""}
            onChange={(e) =>
              onDurationChange(
                e.target.value ? parseInt(e.target.value, 10) : null
              )
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="0"
          />
        </div>
      </div>
    </>
  );
};
