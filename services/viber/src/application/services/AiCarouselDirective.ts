/**
 * AI Carousel Directive
 *
 * Parses an AI reply for a JSON carousel directive and builds a Viber
 * rich_media payload from dynamically generated card content.
 *
 * Directive contract (produced by the LLM, instructed via prompt templates):
 *
 * {
 *   "type": "carousel",
 *   "text": "optional intro text",
 *   "cards": [
 *     {
 *       "title": "Card title",
 *       "description": "short text",
 *       "image": "https://...",
 *       "buttons": [
 *         { "text": "Open map", "actionType": "open-url", "actionBody": "https://..." },
 *         { "text": "Tell me more", "actionType": "reply", "actionBody": "Tell me more about X" }
 *       ]
 *     }
 *   ]
 * }
 *
 * Reply buttons intentionally carry NO buttonsPrefix: tapping one routes the
 * text back to the AI as a normal user message (follow-up questions).
 *
 * Location: Application layer (Hexagonal Architecture)
 */

const MAX_CARDS = 6;
/** Viber rich_media hard limit on rows per card */
const MAX_GROUP_ROWS = 7;
const IMAGE_ROWS = 3;
const CARD_COLUMNS = 6;

const TITLE_COLOR = "#131313";
const DESCRIPTION_COLOR = "#8E8E93";
const BUTTON_TEXT_COLOR = "#FFFFFF";
const BUTTON_BG_COLOR = "#7360F2";

export interface AiCarouselButton {
  text: string;
  actionType: "reply" | "open-url";
  actionBody: string;
}

export interface AiCarouselCard {
  title?: string;
  description?: string;
  image?: string;
  buttons: AiCarouselButton[];
}

export interface AiCarouselDirective {
  text?: string;
  cards: AiCarouselCard[];
}

/**
 * Strip markdown code fences (```json ... ```) that LLMs often wrap JSON in.
 */
const stripCodeFences = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return trimmed;
  }
  const firstLineEnd = trimmed.indexOf("\n");
  if (firstLineEnd === -1) {
    return trimmed;
  }
  return trimmed.slice(firstLineEnd + 1, -3).trim();
};

/**
 * Parse text as a JSON object, tolerating surrounding prose:
 * tries the whole (fence-stripped) text first, then the substring between
 * the first "{" and the last "}" (LLMs often add words around the JSON).
 */
const parseJsonObjectLoose = (text: string): unknown | null => {
  const cleaned = stripCodeFences(text);
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    candidates.push(cleaned.slice(start, end + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }
  return null;
};

const asNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
};

const parseButton = (raw: unknown): AiCarouselButton | null => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const text = asNonEmptyString(candidate.text);
  const actionBody = asNonEmptyString(candidate.actionBody);
  const actionType = candidate.actionType;
  if (
    !text ||
    !actionBody ||
    (actionType !== "reply" && actionType !== "open-url")
  ) {
    return null;
  }
  return { text, actionType, actionBody };
};

const parseCard = (raw: unknown): AiCarouselCard | null => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const title = asNonEmptyString(candidate.title);
  const description = asNonEmptyString(candidate.description);
  const image = asNonEmptyString(candidate.image);

  // A card needs at least a title or an image to be renderable
  if (!title && !image) {
    return null;
  }

  const buttons: AiCarouselButton[] = Array.isArray(candidate.buttons)
    ? candidate.buttons
        .map(parseButton)
        .filter((button): button is AiCarouselButton => button !== null)
    : [];

  return { title, description, image, buttons };
};

/**
 * Parse an AI reply as a carousel directive.
 * Returns null when the text is not a valid directive with at least one
 * renderable card — the caller then falls back to plain text.
 */
export const parseAiCarouselDirective = (
  text: string
): AiCarouselDirective | null => {
  const parsed = parseJsonObjectLoose(text);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (candidate.type !== "carousel" || !Array.isArray(candidate.cards)) {
    return null;
  }

  const cards = candidate.cards
    .map(parseCard)
    .filter((card): card is AiCarouselCard => card !== null)
    .slice(0, MAX_CARDS);

  if (cards.length === 0) {
    return null;
  }

  return { text: asNonEmptyString(candidate.text), cards };
};

const escapeText = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const fillerCell = (rows = 1): Record<string, unknown> => ({
  Columns: CARD_COLUMNS,
  Rows: rows,
  Text: "",
  ActionType: "none",
  ActionBody: "none",
  Silent: true,
});

const imageCell = (image: string | undefined): Record<string, unknown> => {
  if (!image) {
    return fillerCell(IMAGE_ROWS);
  }
  return {
    Columns: CARD_COLUMNS,
    Rows: IMAGE_ROWS,
    Text: "",
    ActionType: "none",
    ActionBody: "none",
    BgMedia: image,
    BgMediaType: "picture",
    BgMediaScaleType: "crop",
    Silent: true,
  };
};

const titleCell = (title: string | undefined): Record<string, unknown> => {
  if (!title) {
    return fillerCell();
  }
  return {
    Columns: CARD_COLUMNS,
    Rows: 1,
    Text: `<font color="${TITLE_COLOR}"><b>${escapeText(title)}</b></font>`,
    ActionType: "none",
    ActionBody: "none",
    TextSize: "medium",
    TextVAlign: "middle",
    TextHAlign: "left",
    Silent: true,
  };
};

const descriptionCell = (
  description: string | undefined
): Record<string, unknown> => {
  if (!description) {
    return fillerCell();
  }
  return {
    Columns: CARD_COLUMNS,
    Rows: 2,
    Text: `<font color="${DESCRIPTION_COLOR}">${escapeText(
      description
    )}</font>`,
    ActionType: "none",
    ActionBody: "none",
    TextSize: "small",
    TextVAlign: "top",
    TextHAlign: "left",
    Silent: true,
  };
};

const actionButtonCell = (
  button: AiCarouselButton | undefined
): Record<string, unknown> => {
  if (!button) {
    return fillerCell();
  }
  return {
    Columns: CARD_COLUMNS,
    Rows: 1,
    Text: `<font color="${BUTTON_TEXT_COLOR}">${escapeText(
      button.text
    )}</font>`,
    ActionType: button.actionType,
    ActionBody: button.actionBody,
    BgColor: BUTTON_BG_COLOR,
    TextSize: "small",
    TextVAlign: "middle",
    TextHAlign: "center",
    Silent: true,
  };
};

/**
 * Build a Viber rich_media payload from directive cards.
 *
 * Layout is uniform across cards (Viber requires equal card height):
 * image (3 rows, when any card has one), title (1 row), description (1 row),
 * then one row per action button — padded with filler cells and capped at
 * MAX_GROUP_ROWS total rows.
 */
export const buildRichMediaFromCards = (cards: AiCarouselCard[]): object => {
  const hasImage = cards.some((card) => card.image);
  const hasTitle = cards.some((card) => card.title);
  const hasDescription = cards.some((card) => card.description);

  const imageRows = hasImage ? IMAGE_ROWS : 0;
  const titleRows = hasTitle ? 1 : 0;
  const descriptionRows = hasDescription ? 1 : 0;

  const rowsLeftForButtons =
    MAX_GROUP_ROWS - imageRows - titleRows - descriptionRows;
  const maxButtons = Math.min(
    Math.max(...cards.map((card) => card.buttons.length)),
    Math.max(rowsLeftForButtons, 0)
  );

  const groupRows = imageRows + titleRows + descriptionRows + maxButtons;

  const buttons: Record<string, unknown>[] = [];
  for (const card of cards) {
    if (hasImage) {
      buttons.push(imageCell(card.image));
    }
    if (hasTitle) {
      buttons.push(titleCell(card.title));
    }
    if (hasDescription) {
      buttons.push(descriptionCell(card.description));
    }
    for (let i = 0; i < maxButtons; i++) {
      buttons.push(actionButtonCell(card.buttons[i]));
    }
  }

  return {
    Type: "rich_media",
    ButtonsGroupColumns: CARD_COLUMNS,
    ButtonsGroupRows: groupRows,
    Buttons: buttons,
  };
};
