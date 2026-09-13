"use client";

import type { ButtonFrame } from "../model/types";

const LOCAL_FALLBACK_FRAME: ButtonFrame = {
  BorderWidth: 1,
  BorderColor: "#000000",
  CornerRadius: 10,
};

interface ButtonFrameFieldsProps {
  frame: ButtonFrame | null;
  idPrefix: string;
  defaultFrame?: ButtonFrame;
  onChange: (frame: ButtonFrame | null) => void;
}

export const ButtonFrameFields = ({
  frame,
  idPrefix,
  defaultFrame = LOCAL_FALLBACK_FRAME,
  onChange,
}: ButtonFrameFieldsProps) => {
  const enabled = frame !== null;

  const handleToggleDrawFrame = (checked: boolean) => {
    onChange(checked ? defaultFrame : null);
  };

  const handleCornerRadiusChange = (value: string) => {
    if (!frame) return;
    onChange({ ...frame, CornerRadius: Number(value) });
  };

  const handleBorderWidthChange = (value: string) => {
    if (!frame) return;
    onChange({ ...frame, BorderWidth: Number(value) });
  };

  const handleBorderColorChange = (value: string) => {
    if (!frame) return;
    onChange({ ...frame, BorderColor: value });
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          id={`${idPrefix}-draw-frame`}
          checked={enabled}
          onChange={(e) => handleToggleDrawFrame(e.target.checked)}
          data-testid={`${idPrefix}-draw-frame`}
        />
        Draw frame
      </label>
      {enabled && frame && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${idPrefix}-corner-radius`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Corner radius
            </label>
            <input
              type="number"
              id={`${idPrefix}-corner-radius`}
              min={0}
              max={10}
              value={frame.CornerRadius}
              onChange={(e) => handleCornerRadiusChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-border-width`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Border width
            </label>
            <input
              type="number"
              id={`${idPrefix}-border-width`}
              min={0}
              max={10}
              value={frame.BorderWidth}
              onChange={(e) => handleBorderWidthChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="col-span-2">
            <label
              htmlFor={`${idPrefix}-border-color`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Border color
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <input
                type="color"
                id={`${idPrefix}-border-color`}
                value={frame.BorderColor.slice(0, 7)}
                onChange={(e) => handleBorderColorChange(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={frame.BorderColor}
                onChange={(e) => handleBorderColorChange(e.target.value)}
                placeholder="#000000"
                pattern="#[0-9A-Fa-f]{6,8}"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
