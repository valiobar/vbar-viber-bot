/**
 * Carousel Validators
 *
 * Validates carousel-level fields, per-card structure (row budget, CTA
 * fields, image URL), custom-card buttons, and the total button cap.
 */

import type { ButtonDTO, CarouselCardDTO } from "../types";
import { CardFlattener } from "./CardFlattener";

export class CarouselValidators {
  static validateCarousel(input: {
    humanReadableName: string;
    BgColor: string | null;
    ButtonsGroupColumns: number;
    ButtonsGroupRows: number;
    Cards: CarouselCardDTO[];
  }): void {
    if (!input.humanReadableName?.trim()) {
      throw new Error("humanReadableName is required");
    }
    if (input.ButtonsGroupColumns < 1 || input.ButtonsGroupColumns > 6) {
      throw new Error("ButtonsGroupColumns must be between 1 and 6");
    }
    if (input.ButtonsGroupRows < 1 || input.ButtonsGroupRows > 7) {
      throw new Error("ButtonsGroupRows must be between 1 and 7");
    }
    if (
      input.BgColor !== null &&
      !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(input.BgColor)
    ) {
      throw new Error("BgColor must be a valid hex color or null");
    }
    if (!Array.isArray(input.Cards) || input.Cards.length === 0) {
      throw new Error("Carousel must have at least one card");
    }

    input.Cards.forEach((card, index) =>
      this.validateCard(
        card,
        index,
        input.ButtonsGroupColumns,
        input.ButtonsGroupRows
      )
    );

    const totalButtons = CardFlattener.flattenCards(
      input.Cards,
      input.ButtonsGroupColumns,
      input.ButtonsGroupRows
    ).length;
    const maxButtons = 6 * input.ButtonsGroupColumns * input.ButtonsGroupRows;
    if (totalButtons > maxButtons) {
      throw new Error(`Carousel exceeds the maximum of ${maxButtons} buttons`);
    }
  }

  static validateCard(
    card: CarouselCardDTO,
    index: number,
    groupColumns: number,
    groupRows: number
  ): void {
    if (card.mode === "structured") {
      this.validateStructuredCard(card, index, groupRows);
    } else {
      this.validateCustomCard(card, index, groupColumns, groupRows);
    }
  }

  private static validateStructuredCard(
    card: CarouselCardDTO,
    index: number,
    groupRows: number
  ): void {
    const { textRows, ctaRows, hasText } =
      CardFlattener.structuredRowBudget(card);
    if (!card.image && !hasText && ctaRows === 0) {
      throw new Error(
        `Card ${index + 1}: add an image, text, or at least one button`
      );
    }
    if (card.image) {
      this.validateImageUrl(card.image, index);
      if (groupRows - textRows - ctaRows < 1) {
        throw new Error(
          `Card ${index + 1}: no rows left for the image — reduce text rows or CTA buttons`
        );
      }
    }
    if (!card.image && ctaRows >= groupRows && hasText) {
      throw new Error(
        `Card ${index + 1}: too many CTA buttons for the card height`
      );
    }
    this.validateCtaButtons(card, index);
  }

  private static validateImageUrl(image: string, index: number): void {
    try {
      const url = new URL(image);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new Error(`Card ${index + 1}: image must be a valid http(s) URL`);
    }
  }

  private static validateCtaButtons(
    card: CarouselCardDTO,
    index: number
  ): void {
    for (const [i, cta] of card.ctaButtons.entries()) {
      if (!cta.text.trim()) {
        throw new Error(`Card ${index + 1}, button ${i + 1}: text is required`);
      }
      if (cta.actionType !== "none" && !cta.actionBody.trim()) {
        throw new Error(
          `Card ${index + 1}, button ${i + 1}: action body is required`
        );
      }
      if (cta.actionType === "open-url") {
        try {
          new URL(cta.actionBody.trim());
        } catch {
          throw new Error(
            `Card ${index + 1}, button ${i + 1}: action body must be a valid URL`
          );
        }
      }
    }
  }

  private static validateCustomCard(
    card: CarouselCardDTO,
    index: number,
    groupColumns: number,
    groupRows: number
  ): void {
    if (!card.Buttons || card.Buttons.length === 0) {
      throw new Error(
        `Card ${index + 1}: custom card must have at least one button`
      );
    }
    for (const [i, button] of card.Buttons.entries()) {
      if (button.Columns < 1 || button.Columns > groupColumns) {
        throw new Error(
          `Card ${index + 1}, button ${i + 1}: Columns must be 1-${groupColumns}`
        );
      }
      if (button.Rows < 1 || button.Rows > groupRows) {
        throw new Error(
          `Card ${index + 1}, button ${i + 1}: Rows must be 1-${groupRows}`
        );
      }
      if (
        button.ActionType === "location-picker" ||
        button.ActionType === "share-phone"
      ) {
        throw new Error(
          `Card ${index + 1}, button ${i + 1}: '${button.ActionType}' is not allowed in carousels`
        );
      }
    }
    const usedRows = this.simulateCardRows(card.Buttons, groupColumns);
    if (usedRows !== groupRows) {
      throw new Error(
        `Card ${index + 1}: buttons fill ${usedRows} of ${groupRows} rows — every card must fill the block exactly`
      );
    }
  }

  /** Simulates Viber's left-to-right / wrap layout and returns total rows used */
  private static simulateCardRows(
    buttons: ButtonDTO[],
    groupColumns: number
  ): number {
    let row = 0;
    let col = 0;
    let maxRow = 0;
    for (const button of buttons) {
      if (col + button.Columns > groupColumns) {
        row = maxRow;
        col = 0;
      }
      maxRow = Math.max(maxRow, row + button.Rows);
      col += button.Columns;
      if (col >= groupColumns) {
        row = maxRow;
        col = 0;
      }
    }
    return maxRow;
  }
}
