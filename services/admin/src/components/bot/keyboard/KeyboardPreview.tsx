"use client";

/**
 * KeyboardPreview Component
 *
 * Displays a visual preview of a keyboard with buttons in a phone-like frame
 */

import type { ButtonDTO } from "@/domains/keyboard/application/dto/ButtonDTO";
import type { InputFieldState } from "@/domains/keyboard/types";

interface KeyboardPreviewProps {
  /**
   * Array of buttons to display
   */
  buttons: (Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
    tempId?: string;
  })[];

  /**
   * Keyboard background color (optional)
   */
  bgColor?: string | null;

  /**
   * Keyboard title (optional)
   */
  title?: string | null;

  /**
   * Input field state (regular, minimized, or hidden)
   */
  inputFieldState?: InputFieldState;

  /**
   * Callback when a button in the preview is clicked
   */
  onButtonClick?: (index: number) => void;
}

const KeyboardPreview = ({
  buttons,
  bgColor,
  title,
  inputFieldState = "hidden",
  onButtonClick,
}: KeyboardPreviewProps) => {
  // Screen width is 320px, 6 columns
  const SCREEN_WIDTH = 320;
  const COLUMNS = 6;
  const COLUMN_WIDTH = SCREEN_WIDTH / COLUMNS;
  const ROW_HEIGHT = COLUMN_WIDTH * 1.1; // 10% more than column width

  // Calculate button styles
  const getButtonStyle = (button: KeyboardPreviewProps["buttons"][0]) => {
    const baseStyle: React.CSSProperties = {
      gridColumn: `span ${button.Columns}`,
      gridRow: `span ${button.Rows}`,
      color: button.TextColor,
      display: "flex",
      flexDirection: "column",
      alignItems:
        button.TextHAlign === "left"
          ? "flex-start"
          : button.TextHAlign === "right"
          ? "flex-end"
          : "center",
      justifyContent:
        button.TextVAlign === "top"
          ? "flex-start"
          : button.TextVAlign === "bottom"
          ? "flex-end"
          : "center",
      padding: "8px 4px",
      borderRadius: "0px",
      fontSize:
        button.TextSize === "small"
          ? "11px"
          : button.TextSize === "large"
          ? "15px"
          : "13px",
      fontWeight: "500",
      wordBreak: "break-word",
      overflow: "hidden",
      textAlign: "center",
      minHeight: `${button.Rows * ROW_HEIGHT}px`,
      width: "100%",
      height: "100%",
    };

    // Apply background media or color
    if (button.BgMedia) {
      // If BgMedia is provided, use it as background image
      baseStyle.backgroundImage = `url(${button.BgMedia})`;
      baseStyle.backgroundRepeat = "no-repeat";
      baseStyle.backgroundPosition = "center";

      // Apply scale type
      switch (button.BgMediaScaleType) {
        case "crop":
          baseStyle.backgroundSize = "cover";
          break;
        case "fill":
          baseStyle.backgroundSize = "100% 100%";
          break;
        case "fit":
        default:
          baseStyle.backgroundSize = "contain";
          break;
      }

      // If BgColor is also provided, it can be used as a fallback or overlay
      if (button.BgColor) {
        baseStyle.backgroundColor = button.BgColor;
      }
    } else {
      // Only BgColor, no media
      baseStyle.backgroundColor = button.BgColor || "#ffffff";
    }

    return baseStyle;
  };

  return (
    <div className="flex items-center justify-center p-2">
      {/* Phone Frame */}
      <div className="relative">
        {/* Phone Border/Frame */}
        <div className="relative rounded-[2.5rem] border-[12px] border-gray-800 bg-gray-800 dark:border-gray-300 dark:bg-gray-300 shadow-2xl">
          {/* Screen Bezel */}
          <div className="relative overflow-hidden rounded-[1.5rem] bg-black dark:bg-gray-900">
            {/* Notch (optional) */}
            <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-800 dark:bg-gray-300"></div>

            {/* Screen Content */}
            <div
              className="relative flex h-[600px] w-[320px] flex-col"
              style={{
                backgroundColor: "#f5f5f5",
              }}
            >
              {/* Title (if provided) */}
              {title && (
                <div className="mb-4 text-center">
                  <h3
                    className="text-lg font-semibold"
                    style={{
                      color: "#1f2937",
                    }}
                  >
                    {title}
                  </h3>
                </div>
              )}

              {/* Spacer to push keyboard to bottom */}
              <div className="flex-1"></div>

              {/* Keyboard Container - positioned at bottom, max 45% of screen height */}
              <div
                className="flex flex-col"
                style={{
                  maxHeight: "45%",
                  backgroundColor: bgColor || "#f5f5f5",
                }}
              >
                {/* Input Field (when not hidden) */}
                {inputFieldState !== "hidden" && (
                  <div
                    className="bg-white border-t border-gray-200 dark:border-gray-700"
                    style={{
                      height: inputFieldState === "minimized" ? "36px" : "52px",
                      flexShrink: 0,
                      padding: "8px 12px",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="h-full w-full border-none bg-transparent px-2 text-sm outline-none dark:text-white"
                      readOnly
                    />
                  </div>
                )}

                {/* Keyboard Buttons Grid - stacked from bottom */}
                {buttons.length > 0 ? (
                  <div
                    className="grid overflow-y-auto"
                    style={{
                      gridTemplateColumns: "repeat(6, 1fr)",
                      gridAutoRows: `${ROW_HEIGHT}px`,
                      alignContent: "end",
                      gap: "1px",
                      backgroundColor: bgColor || "#f5f5f5",
                    }}
                  >
                    {buttons.map((button, index) => (
                      <div
                        key={button.tempId || `btn-${index}`}
                        style={getButtonStyle(button)}
                        className="transition-colors cursor-pointer hover:opacity-80"
                        onClick={() => onButtonClick?.(index)}
                      >
                        {button.Text || "Button"}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No buttons to display
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Home Indicator (iOS style) */}
            <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30 dark:bg-white/50"></div>
          </div>
        </div>

        {/* Phone Frame Shadow */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-gray-900/20 dark:from-gray-100/20 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
};

export default KeyboardPreview;
