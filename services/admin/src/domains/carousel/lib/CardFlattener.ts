/**
 * Card Flattener
 *
 * Converts carousel cards into Viber-shaped buttons that fill exactly
 * ButtonsGroupRows rows (prevents card bleed into the next block).
 */

import type { ButtonDTO, CarouselCardDTO, CarouselCtaDTO } from "../types";

type ButtonFields = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">;

const baseButton = (overrides: Partial<ButtonFields>): ButtonFields => ({
  Columns: 6,
  Rows: 1,
  Text: "",
  TextColor: "#000000",
  BgColor: null,
  BgMedia: null,
  BgMediaType: "picture",
  BgMediaScaleType: "crop",
  BgLoop: true,
  ActionType: "none",
  ActionBody: "none", // mongoose requires non-empty ActionBody
  OpenURLType: "internal",
  InternalBrowser: { Mode: "fullscreen-portrait" },
  TextVAlign: "middle",
  TextHAlign: "center",
  TextSize: "regular",
  Silent: true,
  isJson: false,
  ...overrides,
});

export class CardFlattener {
  /** Rows used by the structured parts of a card (before image expansion) */
  static structuredRowBudget(card: CarouselCardDTO): {
    textRows: number;
    ctaRows: number;
    hasText: boolean;
  } {
    const hasText = Boolean(card.title.trim() || card.description.trim());
    return {
      textRows: hasText ? card.textRows : 0,
      ctaRows: card.ctaButtons.length,
      hasText,
    };
  }

  /** Flattens one card into buttons that fill exactly `groupRows` rows */
  static flattenCard(
    card: CarouselCardDTO,
    groupColumns: number,
    groupRows: number
  ): ButtonFields[] {
    if (card.mode === "custom") {
      return card.Buttons.map(
        ({ id: _i, createdAt: _c, updatedAt: _u, ...fields }) => fields
      );
    }

    const { textRows, ctaRows, hasText } = this.structuredRowBudget(card);
    const buttons: ButtonFields[] = [];

    if (card.image) {
      const imageRows = groupRows - textRows - ctaRows; // validated >= 1 in CarouselValidators
      buttons.push(
        baseButton({
          Columns: groupColumns,
          Rows: imageRows,
          BgMedia: card.image,
          BgMediaScaleType: "crop",
        })
      );
    }

    if (hasText) {
      // No image: text expands to fill the remaining block height
      const rows = card.image ? textRows : groupRows - ctaRows;
      const text =
        `<font color="${card.titleColor}"><b>${card.title}</b></font>` +
        (card.description
          ? `<br><font color="${card.descriptionColor}">${card.description}</font>`
          : "");
      buttons.push(
        baseButton({
          Columns: groupColumns,
          Rows: rows,
          Text: text,
          TextColor: card.titleColor,
          TextVAlign: "top",
          TextHAlign: "left",
        })
      );
    }

    for (const cta of card.ctaButtons) {
      buttons.push(this.ctaToButton(cta, groupColumns));
    }

    return buttons;
  }

  private static ctaToButton(
    cta: CarouselCtaDTO,
    groupColumns: number
  ): ButtonFields {
    return baseButton({
      Columns: groupColumns,
      Rows: 1,
      Text: cta.text,
      TextColor: cta.textColor,
      BgColor: cta.bgColor,
      ActionType: cta.actionType,
      ActionBody: cta.actionType === "none" ? "none" : cta.actionBody,
      OpenURLType: cta.openURLType,
      Silent: cta.silent,
      TextSize: "large",
    });
  }

  /** Flattens all cards; caller validates the result count */
  static flattenCards(
    cards: CarouselCardDTO[],
    groupColumns: number,
    groupRows: number
  ): ButtonFields[] {
    return cards.flatMap((card) =>
      this.flattenCard(card, groupColumns, groupRows)
    );
  }
}
