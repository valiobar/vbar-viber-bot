"use client";

/**
 * KeyboardPreview Component
 *
 * Displays a visual preview of a keyboard with buttons in a phone-like frame
 */

import { useState } from "react";
import type { CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ButtonDTO, InputFieldState } from "../model/types";

type PreviewButton = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
  tempId?: string;
};

interface KeyboardPreviewProps {
  /**
   * Array of buttons to display
   */
  buttons: PreviewButton[];

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

  /**
   * Callback when a button is reordered by drag-and-drop
   */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

interface SortablePreviewButtonProps {
  id: string;
  button: PreviewButton;
  index: number;
  style: CSSProperties;
  onButtonClick?: (index: number) => void;
}

const getButtonId = (button: PreviewButton, index: number): string =>
  button.tempId || `btn-${index}`;

const SortablePreviewButton = ({
  id,
  button,
  index,
  style,
  onButtonClick,
}: SortablePreviewButtonProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
      className="cursor-pointer transition-colors hover:opacity-80"
      onClick={() => {
        if (!isDragging) onButtonClick?.(index);
      }}
      {...attributes}
      {...listeners}
      aria-label={`Reorder or edit button ${index + 1}`}
    >
      {button.Text || "Button"}
    </div>
  );
};

export const KeyboardPreview = ({
  buttons,
  bgColor,
  title,
  inputFieldState = "hidden",
  onButtonClick,
  onReorder,
}: KeyboardPreviewProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const canReorder = Boolean(onReorder) && buttons.length >= 2;
  const buttonIds = buttons.map((button, index) => getButtonId(button, index));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Screen width is 320px
  const SCREEN_WIDTH = 320;
  // Viber keyboards use a 6-column grid
  const COLUMNS = 6;
  const COLUMN_WIDTH = SCREEN_WIDTH / COLUMNS;
  const ROW_HEIGHT = COLUMN_WIDTH * 1.1; // 10% more than column width

  const getButtonStyle = (button: PreviewButton) => {
    const baseStyle: CSSProperties = {
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    onReorder?.(
      buttonIds.indexOf(String(active.id)),
      buttonIds.indexOf(String(over.id))
    );
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeButton = activeId
    ? buttons.find((button, index) => getButtonId(button, index) === activeId)
    : undefined;

  const buttonsGrid = (
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
      {buttons.map((button, index) => {
        const id = buttonIds[index];
        if (canReorder) {
          return (
            <SortablePreviewButton
              key={id}
              id={id}
              button={button}
              index={index}
              style={getButtonStyle(button)}
              onButtonClick={onButtonClick}
            />
          );
        }

        return (
          <div
            key={id}
            style={getButtonStyle(button)}
            className="cursor-pointer transition-colors hover:opacity-80"
            onClick={() => onButtonClick?.(index)}
          >
            {button.Text || "Button"}
          </div>
        );
      })}
    </div>
  );

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
                {buttons.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No buttons to display
                    </p>
                  </div>
                )}
                {buttons.length > 0 && !canReorder && buttonsGrid}
                {buttons.length > 0 && canReorder && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={buttonIds}
                      strategy={rectSortingStrategy}
                    >
                      {buttonsGrid}
                    </SortableContext>
                    <DragOverlay>
                      {activeButton ? (
                        <div
                          style={getButtonStyle(activeButton)}
                          className="cursor-grabbing opacity-90 shadow-lg"
                        >
                          {activeButton.Text || "Button"}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
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
