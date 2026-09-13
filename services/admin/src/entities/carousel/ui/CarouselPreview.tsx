"use client";

/**
 * CarouselPreview Component
 *
 * Phone-frame preview of a rich-media carousel as a horizontally
 * scrollable card strip in the chat area (not the keyboard area).
 * Structured-card row math mirrors CardFlattener so the preview
 * matches the layout that will be sent to Viber.
 */

import type { CSSProperties } from "react";
import type { ButtonDTO, CarouselCardDTO } from "../model/types";

interface CarouselPreviewProps {
  cards: CarouselCardDTO[];
  bgColor?: string | null;
  buttonsGroupColumns: number;
  buttonsGroupRows: number;
  activeCardIndex?: number | null;
  onCardClick?: (index: number) => void;
}

const CARD_WIDTH = 232;
const ROW_HEIGHT = 40;

/** Mirrors CardFlattener.structuredRowBudget so preview matches the sent layout */
const structuredRows = (card: CarouselCardDTO, groupRows: number) => {
  const hasText = Boolean(card.title.trim() || card.description.trim());
  const textRows = hasText ? card.textRows : 0;
  const ctaRows = card.ctaButtons.length;
  const imageRows = card.image
    ? Math.max(groupRows - textRows - ctaRows, 1)
    : 0;
  return {
    hasText,
    textRows: card.image ? textRows : groupRows - ctaRows,
    ctaRows,
    imageRows,
  };
};

const alignItemsFor = (align: ButtonDTO["TextHAlign"]): CSSProperties["alignItems"] => {
  if (align === "left") return "flex-start";
  if (align === "right") return "flex-end";
  return "center";
};

const justifyContentFor = (
  align: ButtonDTO["TextVAlign"]
): CSSProperties["justifyContent"] => {
  if (align === "top") return "flex-start";
  if (align === "bottom") return "flex-end";
  return "center";
};

const fontSizeFor = (size: ButtonDTO["TextSize"]): string => {
  if (size === "small") return "11px";
  if (size === "large") return "15px";
  return "13px";
};

const getButtonStyle = (button: ButtonDTO): CSSProperties => {
  const baseStyle: CSSProperties = {
    gridColumn: `span ${button.Columns}`,
    gridRow: `span ${button.Rows}`,
    color: button.TextColor,
    display: "flex",
    flexDirection: "column",
    alignItems: alignItemsFor(button.TextHAlign),
    justifyContent: justifyContentFor(button.TextVAlign),
    padding: "8px 4px",
    borderRadius: "0px",
    fontSize: fontSizeFor(button.TextSize),
    fontWeight: "500",
    wordBreak: "break-word",
    overflow: "hidden",
    textAlign: "center",
    minHeight: `${button.Rows * ROW_HEIGHT}px`,
    width: "100%",
    height: "100%",
  };

  if (button.BgMedia) {
    baseStyle.backgroundImage = `url(${button.BgMedia})`;
    baseStyle.backgroundRepeat = "no-repeat";
    baseStyle.backgroundPosition = "center";

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

    if (button.BgColor) {
      baseStyle.backgroundColor = button.BgColor;
    }
  } else {
    baseStyle.backgroundColor = button.BgColor || "#ffffff";
  }

  if (button.Frame != null) {
    baseStyle.borderRadius = `${button.Frame.CornerRadius}px`;
    baseStyle.border = `${button.Frame.BorderWidth}px solid ${button.Frame.BorderColor}`;
  }

  return baseStyle;
};

const StructuredCard = ({
  card,
  groupRows,
}: {
  card: CarouselCardDTO;
  groupRows: number;
}) => {
  const { hasText, textRows, ctaRows, imageRows } = structuredRows(
    card,
    groupRows
  );
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow">
      {card.image && (
        <div
          style={{
            height: imageRows * ROW_HEIGHT,
            backgroundImage: `url(${card.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-label={card.title || "Card image"}
        />
      )}
      {hasText && (
        <div
          className="px-2 py-1"
          style={{ height: textRows * ROW_HEIGHT, overflow: "hidden" }}
        >
          <p className="text-sm font-bold" style={{ color: card.titleColor }}>
            {card.title}
          </p>
          <p className="text-xs" style={{ color: card.descriptionColor }}>
            {card.description}
          </p>
        </div>
      )}
      {card.ctaButtons.map((cta, i) => (
        <div
          key={i}
          className="flex items-center justify-center text-sm font-medium"
          style={{
            height: ROW_HEIGHT,
            color: cta.textColor,
            backgroundColor: cta.bgColor || "#ffffff",
            ...(cta.Frame != null
              ? {
                  borderRadius: `${cta.Frame.CornerRadius}px`,
                  border: `${cta.Frame.BorderWidth}px solid ${cta.Frame.BorderColor}`,
                }
              : {}),
          }}
        >
          {cta.text || "Button"}
        </div>
      ))}
      {ctaRows === 0 && !hasText && !card.image && (
        <div className="flex flex-1 items-center justify-center text-xs text-gray-400">
          Empty card
        </div>
      )}
    </div>
  );
};

const CustomCard = ({
  card,
  groupColumns,
}: {
  card: CarouselCardDTO;
  groupColumns: number;
}) => (
  <div
    className="grid h-full overflow-hidden rounded-lg bg-white shadow"
    style={{
      gridTemplateColumns: `repeat(${groupColumns}, 1fr)`,
      gridAutoRows: `${ROW_HEIGHT}px`,
      gap: "1px",
    }}
  >
    {card.Buttons.map((button, i) => (
      <div key={i} style={getButtonStyle(button)}>
        {button.Text || "Button"}
      </div>
    ))}
  </div>
);

export const CarouselPreview = ({
  cards,
  bgColor,
  buttonsGroupColumns,
  buttonsGroupRows,
  activeCardIndex,
  onCardClick,
}: CarouselPreviewProps) => {
  return (
    <div className="flex items-center justify-center p-2" data-testid="carousel-preview">
      <div className="relative">
        <div className="relative rounded-[2.5rem] border-[12px] border-gray-800 bg-gray-800 shadow-2xl dark:border-gray-300 dark:bg-gray-300">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-black dark:bg-gray-900">
            <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-800 dark:bg-gray-300"></div>

            <div
              className="relative flex h-[600px] w-[320px] flex-col"
              style={{ backgroundColor: "#f5f5f5" }}
            >
              <div className="flex-1" />

              <div className="overflow-x-auto pb-6" data-testid="carousel-preview-strip">
                <div
                  className="flex gap-2 px-3"
                  style={{ backgroundColor: bgColor || "transparent" }}
                >
                  {cards.length === 0 && (
                    <p className="w-full py-10 text-center text-sm text-gray-400">
                      No cards to display
                    </p>
                  )}
                  {cards.map((card, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Edit card ${index + 1}`}
                      aria-pressed={index === activeCardIndex}
                      data-testid={`carousel-preview-card-${index}`}
                      className={`shrink-0 cursor-pointer border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-80 ${
                        index === activeCardIndex ? "ring-2 ring-blue-500" : ""
                      }`}
                      style={{
                        width: CARD_WIDTH,
                        height: buttonsGroupRows * ROW_HEIGHT,
                      }}
                      onClick={() => onCardClick?.(index)}
                    >
                      {card.mode === "structured" ? (
                        <StructuredCard card={card} groupRows={buttonsGroupRows} />
                      ) : (
                        <CustomCard
                          card={card}
                          groupColumns={buttonsGroupColumns}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30 dark:bg-white/50"></div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-gray-900/20 to-transparent dark:from-gray-100/20"></div>
      </div>
    </div>
  );
};
