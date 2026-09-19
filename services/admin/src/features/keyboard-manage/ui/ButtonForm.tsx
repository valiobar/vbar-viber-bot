"use client";

/**
 * ButtonForm Component
 *
 * Form for editing button properties
 */

import { useState, type KeyboardEvent } from "react";
import {
  FALLBACK_BUTTON_FRAME,
  resolveButtonFrame,
  useBotSettingsStore,
} from "@/entities/bot-settings";
import {
  ButtonFrameFields,
  type ActionType,
  type ButtonDTO,
  type TextHAlign,
  type TextSize,
  type TextVAlign,
} from "@/entities/keyboard";

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const parseValue = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

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
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const jsonPayload = button.isJson ? parseJsonObject(button.ActionBody) ?? {} : {};
  const settings = useBotSettingsStore((state) => state.settings);

  const handleToggleJson = (checked: boolean) => {
    if (!checked) {
      onUpdate({ isJson: false });
      return;
    }
    if (!parseJsonObject(button.ActionBody)) {
      onUpdate({ isJson: true, ActionBody: JSON.stringify({ trigger: "" }) });
      return;
    }
    onUpdate({ isJson: true });
  };

  const updatePayload = (payload: Record<string, unknown>) => {
    onUpdate({ ActionBody: JSON.stringify(payload) });
  };

  const handleAddProperty = () => {
    if (!newKey.trim() || newKey.trim() === "trigger") return;
    updatePayload({ ...jsonPayload, [newKey.trim()]: parseValue(newValue) });
    setNewKey("");
    setNewValue("");
  };

  const handleRemoveProperty = (key: string) => {
    const { [key]: _removed, ...rest } = jsonPayload;
    updatePayload(rest);
  };

  const handleTriggerChange = (value: string) => {
    updatePayload({ ...jsonPayload, trigger: value });
  };

  const handlePropertyKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddProperty();
    }
  };

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
          Text (Optional)
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
              pattern="#[0-9A-Fa-f]{6}"
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
          {errors[`button-${index}-bgColor`] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors[`button-${index}-bgColor`]}
            </p>
          )}
        </div>
      </div>

      <ButtonFrameFields
        idPrefix={`button-${index}`}
        frame={button.Frame}
        defaultFrame={resolveButtonFrame(settings) ?? FALLBACK_BUTTON_FRAME}
        onChange={(Frame) => onUpdate({ Frame })}
      />

      {/* Action Type and Action Body */}
      <div className="space-y-4">
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
              onChange={(e) => {
                const ActionType = e.target.value as ActionType;
                if (ActionType === "none") {
                  // Viber still requires an ActionBody — auto-fill it
                  onUpdate({ ActionType, ActionBody: "none", isJson: false });
                } else if (
                  button.ActionType === "none" &&
                  button.ActionBody === "none"
                ) {
                  onUpdate({ ActionType, ActionBody: "" });
                } else {
                  onUpdate({ ActionType });
                }
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="reply">Reply</option>
              <option value="open-url">Open URL</option>
              <option value="location-picker">Location Picker</option>
              <option value="share-phone">Share Phone</option>
              <option value="none">None</option>
            </select>
            {button.ActionType === "reply" && (
              <label className="mt-3 flex items-center">
                <input
                  type="checkbox"
                  id={`button-${index}-isJson`}
                  checked={button.isJson}
                  onChange={(e) => handleToggleJson(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  data-testid={`button-${index}-isJson`}
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Is JSON (trigger + user state payload)
                </span>
              </label>
            )}
          </div>

          {/* Action Body — plain input when not editing a JSON payload */}
          {!(button.ActionType === "reply" && button.isJson) && (
            <div>
              <label
                htmlFor={`button-${index}-actionBody`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Action Body
                {(button.ActionType === "reply" ||
                  button.ActionType === "open-url") && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              <input
                type="text"
                id={`button-${index}-actionBody`}
                value={button.ActionBody}
                onChange={(e) => onUpdate({ ActionBody: e.target.value })}
                disabled={button.ActionType === "none"}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
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
          )}
        </div>

        {button.ActionType === "reply" && button.isJson && (
          <div className="space-y-3" data-testid={`button-${index}-jsonEditor`}>
            <div>
              <label
                htmlFor={`button-${index}-jsonTrigger`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Trigger <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id={`button-${index}-jsonTrigger`}
                value={
                  typeof jsonPayload.trigger === "string"
                    ? jsonPayload.trigger
                    : ""
                }
                onChange={(e) => handleTriggerChange(e.target.value)}
                placeholder="Step trigger (required)"
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors[`button-${index}-actionBody`]
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                aria-label="JSON payload trigger"
              />
            </div>

            {Object.entries(jsonPayload)
              .filter(([key]) => key !== "trigger")
              .map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {key}: {JSON.stringify(value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProperty(key)}
                    aria-label={`Remove property ${key}`}
                    className="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Remove
                  </button>
                </div>
              ))}

            <div className="flex space-x-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={handlePropertyKeyDown}
                placeholder="Property"
                aria-label="New JSON property name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handlePropertyKeyDown}
                placeholder="Value"
                aria-label="New JSON property value"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddProperty}
                aria-label="Add JSON property"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Add Property
              </button>
            </div>

            <pre className="overflow-x-auto rounded-md bg-gray-100 p-3 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {button.ActionBody}
            </pre>
            {errors[`button-${index}-actionBody`] && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors[`button-${index}-actionBody`]}
              </p>
            )}
          </div>
        )}
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

