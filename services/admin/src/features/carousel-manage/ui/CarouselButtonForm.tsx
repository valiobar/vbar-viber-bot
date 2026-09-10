"use client";

/**
 * CarouselButtonForm
 *
 * Adapted from keyboard ButtonForm for custom-mode carousel buttons.
 * Rows cap at ButtonsGroupRows (up to 7); Columns cap at ButtonsGroupColumns.
 * location-picker and share-phone are not offered (Viber forbids them in rich media).
 */

import type {
  ActionType,
  ButtonDTO,
  TextHAlign,
  TextSize,
  TextVAlign,
} from "@/entities/carousel";

type FormButton = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
  tempId?: string;
};

interface CarouselButtonFormProps {
  button: FormButton;
  index: number;
  cardIndex: number;
  buttonsGroupColumns: number;
  buttonsGroupRows: number;
  errors: Record<string, string>;
  onUpdate: (
    updates: Partial<Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">>
  ) => void;
}

export const CarouselButtonForm = ({
  button,
  index,
  cardIndex,
  buttonsGroupColumns,
  buttonsGroupRows,
  errors,
  onUpdate,
}: CarouselButtonFormProps) => {
  const fieldKey = (field: string) => `card-${cardIndex}-button-${index}-${field}`;

  return (
    <div
      className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700"
      data-testid="carousel-button-form"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-columns`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Columns (1-{buttonsGroupColumns})
          </label>
          <input
            type="number"
            id={`card-${cardIndex}-button-${index}-columns`}
            min={1}
            max={buttonsGroupColumns}
            value={button.Columns}
            onChange={(e) =>
              onUpdate({ Columns: Number.parseInt(e.target.value, 10) })
            }
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[fieldKey("columns")]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors[fieldKey("columns")] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[fieldKey("columns")]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-rows`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Rows (1-{buttonsGroupRows})
          </label>
          <input
            type="number"
            id={`card-${cardIndex}-button-${index}-rows`}
            min={1}
            max={buttonsGroupRows}
            value={button.Rows}
            onChange={(e) =>
              onUpdate({ Rows: Number.parseInt(e.target.value, 10) })
            }
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[fieldKey("rows")]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors[fieldKey("rows")] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[fieldKey("rows")]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor={`card-${cardIndex}-button-${index}-text`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Text <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id={`card-${cardIndex}-button-${index}-text`}
          value={button.Text}
          onChange={(e) => onUpdate({ Text: e.target.value })}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors[fieldKey("text")]
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="Button text"
        />
        {errors[fieldKey("text")] && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors[fieldKey("text")]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-textColor`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Text Color <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="color"
              id={`card-${cardIndex}-button-${index}-textColor`}
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
                errors[fieldKey("textColor")]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              pattern="#[0-9A-Fa-f]{6}"
            />
          </div>
          {errors[fieldKey("textColor")] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[fieldKey("textColor")]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-bgColor`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Background Color (Optional)
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="color"
              id={`card-${cardIndex}-button-${index}-bgColor`}
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
                errors[fieldKey("bgColor")]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              pattern="#[0-9A-Fa-f]{6}"
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
          {errors[fieldKey("bgColor")] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[fieldKey("bgColor")]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-actionType`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Action Type <span className="text-red-500">*</span>
          </label>
          <select
            id={`card-${cardIndex}-button-${index}-actionType`}
            value={button.ActionType}
            onChange={(e) =>
              onUpdate({ ActionType: e.target.value as ActionType })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="reply">Reply</option>
            <option value="open-url">Open URL</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-actionBody`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Action Body <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id={`card-${cardIndex}-button-${index}-actionBody`}
            value={button.ActionBody}
            onChange={(e) => onUpdate({ ActionBody: e.target.value })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[fieldKey("actionBody")]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder={
              button.ActionType === "open-url" ? "URL" : "Reply text"
            }
          />
          {errors[fieldKey("actionBody")] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[fieldKey("actionBody")]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-bgMedia`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Background Media URL (Optional)
          </label>
          <input
            type="url"
            id={`card-${cardIndex}-button-${index}-bgMedia`}
            value={button.BgMedia || ""}
            onChange={(e) => onUpdate({ BgMedia: e.target.value || null })}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors[fieldKey("bgMedia")]
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="https://example.com/image.jpg"
          />
          {errors[fieldKey("bgMedia")] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[fieldKey("bgMedia")]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-bgMediaScaleType`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Background Media Fit Type
          </label>
          <select
            id={`card-${cardIndex}-button-${index}-bgMediaScaleType`}
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor={`card-${cardIndex}-button-${index}-textVAlign`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Vertical Align
          </label>
          <select
            id={`card-${cardIndex}-button-${index}-textVAlign`}
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
            htmlFor={`card-${cardIndex}-button-${index}-textHAlign`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Horizontal Align
          </label>
          <select
            id={`card-${cardIndex}-button-${index}-textHAlign`}
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
            htmlFor={`card-${cardIndex}-button-${index}-textSize`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Text Size
          </label>
          <select
            id={`card-${cardIndex}-button-${index}-textSize`}
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
