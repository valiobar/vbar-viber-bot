"use client";

/**
 * ButtonPreview Component
 *
 * Displays a visual preview of a button with its styling
 */

import type { ButtonDTO } from "@/domains/keyboard/application/dto/ButtonDTO";

interface ButtonPreviewProps {
  /**
   * Button data to preview
   */
  button: Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">;
}

const ButtonPreview = ({ button }: ButtonPreviewProps) => {
  // Determine background style based on BgMedia and BgColor
  const getBackgroundStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};

    if (button.BgMedia) {
      // If BgMedia is provided, use it as background image
      style.backgroundImage = `url(${button.BgMedia})`;
      style.backgroundRepeat = "no-repeat";
      style.backgroundPosition = "center";

      // Apply scale type
      switch (button.BgMediaScaleType) {
        case "crop":
          style.backgroundSize = "cover";
          break;
        case "fill":
          style.backgroundSize = "100% 100%";
          break;
        case "fit":
        default:
          style.backgroundSize = "contain";
          break;
      }

      // If BgColor is also provided, it can be used as a fallback or overlay
      if (button.BgColor) {
        style.backgroundColor = button.BgColor;
      }
    } else if (button.BgColor) {
      // Only BgColor, no media
      style.backgroundColor = button.BgColor;
    }

    return style;
  };

  return (
    <div className="mb-2 rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900">
      <div
        className="rounded p-2 text-center text-sm"
        style={{
          ...getBackgroundStyle(),
          color: button.TextColor,
          width: `${(button.Columns / 6) * 100}%`,
          minHeight: `${button.Rows * 40}px`,
        }}
      >
        {button.Text || "Button Text"}
      </div>
    </div>
  );
};

export default ButtonPreview;
