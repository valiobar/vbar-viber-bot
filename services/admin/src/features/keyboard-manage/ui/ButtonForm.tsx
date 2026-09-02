"use client";

/**
 * ButtonForm Component
 *
 * Form for editing button properties
 */

import type {
  ActionType,
  ButtonDTO,
  TextHAlign,
  TextSize,
  TextVAlign,
} from "@/entities/keyboard";

interface ButtonFormProps {
  /**
   * Button data to edit
   */
  button: Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
    tempId: string;
  };

  /**
   * Button index for unique IDs
   */
  index: number;

  /**
   * Validation errors
   */
  errors: Record<string, string>;

  /**
   * Callback when button is updated
   */
  onUpdate: (
    updates: Partial<Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">>
  ) => void;
}

export const ButtonForm = ({ button, index, errors, onUpdate }: ButtonFormProps) => {
  return (
    <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
      {/* Basic Properties */}
      <div className="grid grid-cols-2 gap-4">
        {/* Columns */}
        <div>
          <label
            htmlFor={`button-${index}-columns`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Columns (1-6)
          </label>
          <input
            type="number"
            id={`button-${index}-columns`}
            min={1}
            max={6}
            value={button.Columns}
            onChange={(e) =>
              onUpdate({ Columns: parseInt(e.target.value, 10) })
            }
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[`button-${index}-columns`]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors[`button-${index}-columns`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-columns`]}
            </p>
          )}
        </div>

        {/* Rows */}
        <div>
          <label
            htmlFor={`button-${index}-rows`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Rows (1-3)
          </label>
          <input
            type="number"
            id={`button-${index}-rows`}
            min={1}
            max={3}
            value={button.Rows}
            onChange={(e) => onUpdate({ Rows: parseInt(e.target.value, 10) })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[`button-${index}-rows`]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors[`button-${index}-rows`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-rows`]}
            </p>
          )}
        </div>
      </div>

      {/* Text */}
      <div>
        <label
          htmlFor={`button-${index}-text`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Text <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id={`button-${index}-text`}
          value={button.Text}
          onChange={(e) => onUpdate({ Text: e.target.value })}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors[`button-${index}-text`]
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="Button text"
        />
        {errors[`button-${index}-text`] && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors[`button-${index}-text`]}
          </p>
        )}
      </div>

      {/* Text Color and Background Color */}
      <div className="grid grid-cols-2 gap-4">
        {/* Text Color */}
        <div>
          <label
            htmlFor={`button-${index}-textColor`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Text Color <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="color"
              id={`button-${index}-textColor`}
              value={button.TextColor}
              onChange={(e) => onUpdate({ TextColor: e.target.value })}
              className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
            />
            <input
              type="text"
              value={button.TextColor}
              onChange={(e) => onUpdate({ TextColor: e.target.value })}
              placeholder="#000000"
              className={`flex-1 rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors[`button-${index}-textColor`]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              pattern="^#[0-9A-F]{6}$"
            />
          </div>
          {errors[`button-${index}-textColor`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-textColor`]}
            </p>
          )}
        </div>

        {/* Background Color */}
        <div>
          <label
            htmlFor={`button-${index}-bgColor`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Background Color (Optional)
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="color"
              id={`button-${index}-bgColor`}
              value={button.BgColor || "#ffffff"}
              onChange={(e) => onUpdate({ BgColor: e.target.value })}
              className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
            />
            <input
              type="text"
              value={button.BgColor || ""}
              onChange={(e) => onUpdate({ BgColor: e.target.value || null })}
              placeholder="#FFFFFF"
              className={`flex-1 rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors[`button-${index}-bgColor`]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              pattern="^#[0-9A-F]{6}$"
            />
            {button.BgColor && (
              <button
                type="button"
                onClick={() => onUpdate({ BgColor: null })}
                className="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Clear
              </button>
            )}
          </div>
          {errors[`button-${index}-bgColor`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-bgColor`]}
            </p>
          )}
        </div>
      </div>

      {/* Action Type and Action Body */}
      <div className="grid grid-cols-2 gap-4">
        {/* Action Type */}
        <div>
          <label
            htmlFor={`button-${index}-actionType`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Action Type <span className="text-red-500">*</span>
          </label>
          <select
            id={`button-${index}-actionType`}
            value={button.ActionType}
            onChange={(e) =>
              onUpdate({ ActionType: e.target.value as ActionType })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="reply">Reply</option>
            <option value="open-url">Open URL</option>
            <option value="location-picker">Location Picker</option>
            <option value="share-phone">Share Phone</option>
            <option value="none">None</option>
          </select>
        </div>

        {/* Action Body */}
        <div>
          <label
            htmlFor={`button-${index}-actionBody`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Action Body <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id={`button-${index}-actionBody`}
            value={button.ActionBody}
            onChange={(e) => onUpdate({ ActionBody: e.target.value })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[`button-${index}-actionBody`]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder={
              button.ActionType === "reply"
                ? "Reply text"
                : button.ActionType === "open-url"
                ? "URL"
                : "Action body"
            }
          />
          {errors[`button-${index}-actionBody`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-actionBody`]}
            </p>
          )}
        </div>
      </div>

      {/* Background Media URL and Scale Type */}
      <div className="grid grid-cols-2 gap-4">
        {/* Background Media URL */}
        <div>
          <label
            htmlFor={`button-${index}-bgMedia`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Background Media URL (Optional)
          </label>
          <input
            type="url"
            id={`button-${index}-bgMedia`}
            value={button.BgMedia || ""}
            onChange={(e) => onUpdate({ BgMedia: e.target.value || null })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[`button-${index}-bgMedia`]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="https://example.com/image.jpg"
          />
          {errors[`button-${index}-bgMedia`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-bgMedia`]}
            </p>
          )}
        </div>

        {/* Background Media Scale Type */}
        <div>
          <label
            htmlFor={`button-${index}-bgMediaScaleType`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Background Media Fit Type
          </label>
          <select
            id={`button-${index}-bgMediaScaleType`}
            value={button.BgMediaScaleType}
            onChange={(e) => onUpdate({ BgMediaScaleType: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="fit">Fit</option>
            <option value="crop">Crop</option>
            <option value="fill">Fill</option>
          </select>
        </div>
      </div>

      {/* Text Alignment and Size */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor={`button-${index}-textVAlign`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Vertical Align
          </label>
          <select
            id={`button-${index}-textVAlign`}
            value={button.TextVAlign}
            onChange={(e) =>
              onUpdate({ TextVAlign: e.target.value as TextVAlign })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`button-${index}-textHAlign`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Horizontal Align
          </label>
          <select
            id={`button-${index}-textHAlign`}
            value={button.TextHAlign}
            onChange={(e) =>
              onUpdate({ TextHAlign: e.target.value as TextHAlign })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`button-${index}-textSize`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Text Size
          </label>
          <select
            id={`button-${index}-textSize`}
            value={button.TextSize}
            onChange={(e) => onUpdate({ TextSize: e.target.value as TextSize })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="small">Small</option>
            <option value="regular">Regular</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>
  );
};

