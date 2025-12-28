"use client";

/**
 * PictureMessageFields Component
 *
 * Form fields for picture message type
 */

interface PictureMessageFieldsProps {
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
   * Validation error messages
   */
  errors?: {
    pictureMedia?: string;
  };
}

export const PictureMessageFields = ({
  media,
  text,
  thumbnail,
  onMediaChange,
  onTextChange,
  onThumbnailChange,
  errors,
}: PictureMessageFieldsProps) => {
  return (
    <>
      <div>
        <label
          htmlFor="pictureMedia"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Media URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="pictureMedia"
          value={media}
          onChange={(e) => onMediaChange(e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.pictureMedia
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="https://example.com/image.jpg"
        />
        {errors?.pictureMedia && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.pictureMedia}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="pictureText"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Text (optional)
        </label>
        <textarea
          id="pictureText"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Optional text"
        />
      </div>
      <div>
        <label
          htmlFor="pictureThumbnail"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Thumbnail URL (optional)
        </label>
        <input
          type="url"
          id="pictureThumbnail"
          value={thumbnail}
          onChange={(e) => onThumbnailChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="https://example.com/thumb.jpg"
        />
      </div>
    </>
  );
};

