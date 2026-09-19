import type {
  CarouselCtaDefaults,
  CarouselDraft,
  CarouselDraftCard,
  KeyboardButtonDefaults,
  KeyboardDraftButton,
} from "../../ports/in/BuildCarouselUseCase";
import type { LlmCarouselOutput } from "./carouselBuilderPrompt";
import {
  extractJsonObject,
  hexOrNull,
  pickBgLoop,
  pickBgMedia,
  pickBgMediaScaleType,
  pickBgMediaType,
  pickClamped,
  pickFrame,
  pickHex,
  pickNonEmptyString,
  pickOptionalString,
} from "./normalizerPrimitives";

/** Carousel background allows 8-digit hex too (CarouselValidators rule). */
const HEX_COLOR_6_OR_8 = /^#([0-9A-F]{6}|[0-9A-F]{8})$/i;
const CTA_ACTION_TYPES = ["reply", "open-url", "none"];
const CUSTOM_ACTION_TYPES = ["reply", "open-url", "none"];

export function parseLlmCarouselJson(raw: string): LlmCarouselOutput {
  return extractJsonObject<LlmCarouselOutput>(raw);
}

/** Same fallbacks as admin FALLBACK_CTA_TEXT_COLOR / FALLBACK_CTA_BG_COLOR / resolveButtonFrame. */
const HARDCODED_CTA_DEFAULTS: CarouselCtaDefaults = {
  textColor: "#FFFFFF",
  bgColor: "#7360F2",
  Frame: null,
};

/** Same fallbacks as admin FALLBACK_BUTTON_TEXT_COLOR / resolveButtonFrame. */
const HARDCODED_BUTTON_DEFAULTS: KeyboardButtonDefaults = {
  TextColor: "#000000",
  BgColor: null,
  Frame: null,
};

function resolveCtaDefaults(defaults?: CarouselCtaDefaults): CarouselCtaDefaults {
  return {
    textColor: hexOrNull(defaults?.textColor) ?? HARDCODED_CTA_DEFAULTS.textColor,
    bgColor: hexOrNull(defaults?.bgColor) ?? HARDCODED_CTA_DEFAULTS.bgColor,
    Frame: defaults?.Frame ?? HARDCODED_CTA_DEFAULTS.Frame,
  };
}

function resolveButtonDefaults(
  defaults?: KeyboardButtonDefaults
): KeyboardButtonDefaults {
  return {
    TextColor: hexOrNull(defaults?.TextColor) ?? HARDCODED_BUTTON_DEFAULTS.TextColor,
    BgColor: hexOrNull(defaults?.BgColor) ?? HARDCODED_BUTTON_DEFAULTS.BgColor,
    Frame: defaults?.Frame ?? HARDCODED_BUTTON_DEFAULTS.Frame,
  };
}

function findByLabel<T>(
  label: string,
  items: readonly T[],
  getLabel: (item: T) => string
): T | undefined {
  const needle = label.trim().toLowerCase();
  if (!needle) return undefined;
  return items.find((item) => getLabel(item).trim().toLowerCase() === needle);
}

/** Consume the first unused item whose label matches (case-insensitive). */
function takeExistingByLabel<T>(
  label: string,
  unused: T[],
  getLabel: (item: T) => string
): T | undefined {
  const needle = label.trim().toLowerCase();
  if (!needle) return undefined;
  const idx = unused.findIndex((item) => getLabel(item).trim().toLowerCase() === needle);
  if (idx === -1) return undefined;
  return unused.splice(idx, 1)[0];
}

/**
 * Prefer an unused same-label item, then an already-consumed same-label item
 * (duplicate/mirror), then a leftover unused item (rename / reorder).
 */
function matchExisting<T>(
  label: string,
  unused: T[],
  all: readonly T[],
  getLabel: (item: T) => string
): T | undefined {
  return (
    takeExistingByLabel(label, unused, getLabel) ??
    findByLabel(label, all, getLabel) ??
    unused.shift()
  );
}

type LlmCard = LlmCarouselOutput["Cards"][number];
type LlmCustomButton = NonNullable<LlmCard["Buttons"]>[number];
type LlmCta = NonNullable<LlmCard["ctaButtons"]>[number];

function firstButtonText(card: Partial<LlmCard> | CarouselDraftCard): string {
  const buttons = Array.isArray(card.Buttons) ? card.Buttons : [];
  const first = buttons[0];
  if (first && typeof first === "object") {
    const text = "Text" in first ? first.Text : undefined;
    if (typeof text === "string" && text.trim()) return text;
  }
  const ctas = "ctaButtons" in card && Array.isArray(card.ctaButtons) ? card.ctaButtons : [];
  const firstCta = ctas[0];
  if (firstCta && typeof firstCta === "object" && "text" in firstCta) {
    const text = firstCta.text;
    if (typeof text === "string" && text.trim()) return text;
  }
  return "";
}

/**
 * Card identity: title, then first custom-button Text, then image URL.
 * Untitled custom cards must match on button text so a leftover structured
 * card is not consumed (which would restyle the image card and drop Buttons).
 */
function matchExistingCard(
  card: Partial<LlmCard>,
  unused: CarouselDraftCard[],
  all: readonly CarouselDraftCard[]
): CarouselDraftCard | undefined {
  const title = typeof card.title === "string" ? card.title : "";
  const byTitle =
    takeExistingByLabel(title, unused, (c) => c.title) ??
    findByLabel(title, all, (c) => c.title);
  if (byTitle) return byTitle;

  const buttonText = firstButtonText(card);
  const byButton =
    takeExistingByLabel(buttonText, unused, firstButtonText) ??
    findByLabel(buttonText, all, firstButtonText);
  if (byButton) return byButton;

  const image = typeof card.image === "string" ? card.image : "";
  const byImage =
    takeExistingByLabel(image, unused, (c) => c.image ?? "") ??
    findByLabel(image, all, (c) => c.image ?? "");
  if (byImage) return byImage;

  let intendedMode: "custom" | "structured" = "custom";
  if (card.mode === "custom" || card.mode === "structured") {
    intendedMode = card.mode;
  } else if (typeof card.image === "string" && card.image.trim()) {
    intendedMode = "structured";
  }
  const sameModeIdx = unused.findIndex((c) => c.mode === intendedMode);
  if (sameModeIdx !== -1) return unused.splice(sameModeIdx, 1)[0];
  return unused.shift();
}

function resolveMode(
  card: Partial<LlmCard>,
  existing?: CarouselDraftCard
): "custom" | "structured" {
  const llmButtons = Array.isArray(card.Buttons) ? card.Buttons : [];
  // Never drop an existing custom grid just because the model emitted CTAs.
  if (existing?.mode === "custom" && llmButtons.length === 0) return "custom";
  if (card.mode === "custom" || card.mode === "structured") return card.mode;
  if (existing?.mode === "custom" || existing?.mode === "structured") {
    return existing.mode;
  }
  return "custom";
}

/** Old structured-shaped LLM output → a custom grid that fills groupRows. */
function buttonsFromStructuredFields(
  card: Partial<LlmCard>,
  groupColumns: number,
  groupRows: number
): LlmCustomButton[] {
  const title = typeof card.title === "string" ? card.title.trim() : "";
  const ctas = Array.isArray(card.ctaButtons) ? card.ctaButtons : [];
  const actionCount = ctas.length;
  const labelRows = Math.max(1, groupRows - actionCount);
  const buttons: LlmCustomButton[] = [];
  if (title) {
    buttons.push({
      Columns: groupColumns,
      Rows: actionCount > 0 ? labelRows : groupRows,
      Text: title,
      TextColor: "",
      BgColor: null,
      ActionType: "none",
      ActionBody: "",
      isJson: false,
      OpenURLType: "internal",
    });
  }
  ctas.forEach((cta) => {
    buttons.push({
      Columns: groupColumns,
      Rows: 1,
      Text: typeof cta.text === "string" ? cta.text : "",
      TextColor: "",
      BgColor: null,
      ActionType: typeof cta.actionType === "string" ? cta.actionType : "reply",
      ActionBody: typeof cta.actionBody === "string" ? cta.actionBody : "",
      isJson: false,
      OpenURLType: cta.openURLType === "external" ? "external" : "internal",
      Frame: cta.Frame ?? null,
    });
  });
  return buttons;
}

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const asJsonObject = (raw: unknown): Record<string, unknown> | null => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string" && raw.trim()) {
    return parseJsonObject(raw.trim());
  }
  return null;
};

function normalizeReplyAction(
  raw: unknown,
  isJsonFlag: unknown,
  actionType: KeyboardDraftButton["ActionType"]
): { ActionBody: string; isJson: boolean } {
  const flaggedJson = isJsonFlag === true && actionType === "reply";
  const asObj = asJsonObject(raw);
  const looksJson =
    actionType === "reply" && asObj !== null && typeof asObj.trigger === "string";

  if (flaggedJson || looksJson) {
    if (asObj) {
      return { ActionBody: JSON.stringify(asObj), isJson: true };
    }
    const trigger = typeof raw === "string" ? raw.trim() : "";
    return { ActionBody: JSON.stringify({ trigger }), isJson: true };
  }

  return {
    ActionBody: typeof raw === "string" ? raw.trim() : "",
    isJson: false,
  };
}

/** Same visual defaults as admin getDefaultButton (CardEditor.tsx). */
function normalizeCustomButton(
  b: Partial<LlmCustomButton>,
  defaults: KeyboardButtonDefaults,
  groupColumns: number,
  groupRows: number,
  existing?: KeyboardDraftButton
): KeyboardDraftButton {
  const rawType = String(b.ActionType);
  let actionType: KeyboardDraftButton["ActionType"] = "reply";
  if (CUSTOM_ACTION_TYPES.includes(rawType)) {
    actionType = rawType as KeyboardDraftButton["ActionType"];
  } else if (existing?.ActionType && CUSTOM_ACTION_TYPES.includes(existing.ActionType)) {
    actionType = existing.ActionType;
  }
  const llmProvidedAction =
    (typeof b.ActionBody === "string" && b.ActionBody.trim().length > 0) ||
    (typeof b.ActionBody === "object" && b.ActionBody !== null) ||
    b.isJson === true;
  let action: { ActionBody: string; isJson: boolean };
  if (llmProvidedAction || !existing) {
    action = normalizeReplyAction(b.ActionBody, b.isJson, actionType);
  } else {
    action = { ActionBody: existing.ActionBody, isJson: existing.isJson };
  }
  const bgMedia = pickBgMedia(b.BgMedia, existing?.BgMedia);
  return {
    Columns: pickClamped(b.Columns, 1, groupColumns, existing?.Columns, groupColumns),
    Rows: pickClamped(b.Rows, 1, groupRows, existing?.Rows, 1),
    Text: pickNonEmptyString(b.Text, existing?.Text, ""),
    TextColor:
      pickHex(b.TextColor, existing?.TextColor, defaults.TextColor) ?? defaults.TextColor,
    BgColor: pickHex(b.BgColor, existing?.BgColor, defaults.BgColor),
    BgMedia: bgMedia,
    BgMediaType: pickBgMediaType(b.BgMediaType, bgMedia, existing?.BgMediaType),
    BgMediaScaleType: pickBgMediaScaleType(b.BgMediaScaleType, existing?.BgMediaScaleType),
    BgLoop: pickBgLoop(b.BgLoop, existing?.BgLoop),
    ActionType: actionType,
    ...action,
    OpenURLType:
      b.OpenURLType === "external" || b.OpenURLType === "internal"
        ? b.OpenURLType
        : (existing?.OpenURLType ?? "internal"),
    InternalBrowser: existing?.InternalBrowser ?? { Mode: "fullscreen-portrait" },
    TextVAlign: existing?.TextVAlign ?? "middle",
    TextHAlign: existing?.TextHAlign ?? "center",
    TextSize: existing?.TextSize ?? "regular",
    Silent: existing?.Silent ?? true,
    Frame: pickFrame(b.Frame, existing?.Frame, defaults.Frame),
  };
}

function simulateCardRows(
  buttons: Pick<KeyboardDraftButton, "Columns" | "Rows">[],
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

/** Same visual defaults as admin getDefaultCta (CardEditor.tsx), using bot settings. */
function normalizeCta(
  cta: Partial<LlmCta>,
  defaults: CarouselCtaDefaults,
  existing?: CarouselDraftCard["ctaButtons"][number]
): CarouselDraftCard["ctaButtons"][number] {
  return {
    text: pickNonEmptyString(cta.text, existing?.text, ""),
    textColor:
      pickHex(cta.textColor, existing?.textColor, defaults.textColor) ??
      defaults.textColor,
    bgColor: pickHex(cta.bgColor, existing?.bgColor, defaults.bgColor),
    actionType: CTA_ACTION_TYPES.includes(String(cta.actionType))
      ? (cta.actionType as CarouselDraftCard["ctaButtons"][number]["actionType"])
      : (existing?.actionType ?? "reply"),
    actionBody: pickNonEmptyString(cta.actionBody, existing?.actionBody, ""),
    openURLType:
      cta.openURLType === "internal" || cta.openURLType === "external"
        ? cta.openURLType
        : (existing?.openURLType ?? "external"),
    silent: existing?.silent ?? false,
    Frame: pickFrame(cta.Frame, existing?.Frame, defaults.Frame),
  };
}

function emptyStructuredShell(existing?: CarouselDraftCard): Pick<
  CarouselDraftCard,
  "image" | "title" | "titleColor" | "description" | "descriptionColor" | "textRows" | "ctaButtons"
> {
  return {
    image: existing?.image ?? null,
    title: existing?.title ?? "",
    titleColor: existing?.titleColor ?? "#323232",
    description: existing?.description ?? "",
    descriptionColor: existing?.descriptionColor ?? "#777777",
    textRows: existing?.textRows ?? 2,
    ctaButtons: [],
  };
}

function normalizeCard(
  card: Partial<LlmCard>,
  ctaDefaults: CarouselCtaDefaults,
  buttonDefaults: KeyboardButtonDefaults,
  groupColumns: number,
  groupRows: number,
  existing?: CarouselDraftCard
): CarouselDraftCard {
  const mode = resolveMode(card, existing);
  if (mode === "custom") {
    const sourceButtons = existing?.Buttons ?? [];
    const unusedButtons = [...sourceButtons];
    let rawButtons: LlmCustomButton[] = [];
    if (Array.isArray(card.Buttons) && card.Buttons.length > 0) {
      rawButtons = card.Buttons;
    } else if (sourceButtons.length === 0) {
      rawButtons = buttonsFromStructuredFields(card, groupColumns, groupRows);
    }
    return {
      mode: "custom",
      ...emptyStructuredShell(existing),
      Buttons:
        rawButtons.length > 0
          ? rawButtons.map((button) =>
              normalizeCustomButton(
                button,
                buttonDefaults,
                groupColumns,
                groupRows,
                matchExisting(
                  typeof button.Text === "string" ? button.Text : "",
                  unusedButtons,
                  sourceButtons,
                  (item) => item.Text
                )
              )
            )
          : sourceButtons,
    };
  }

  const sourceCtas = existing?.ctaButtons ?? [];
  const unusedCtas = [...sourceCtas];
  return {
    mode: "structured",
    image: pickOptionalString(card.image, existing?.image, null),
    title: pickNonEmptyString(card.title, existing?.title, ""),
    titleColor: pickHex(card.titleColor, existing?.titleColor, "#323232") ?? "#323232",
    description: pickNonEmptyString(card.description, existing?.description, ""),
    descriptionColor:
      pickHex(card.descriptionColor, existing?.descriptionColor, "#777777") ??
      "#777777",
    textRows: pickClamped(card.textRows, 1, 3, existing?.textRows, 2),
    ctaButtons: Array.isArray(card.ctaButtons)
      ? card.ctaButtons.map((cta) =>
          normalizeCta(
            cta,
            ctaDefaults,
            matchExisting(
              typeof cta.text === "string" ? cta.text : "",
              unusedCtas,
              sourceCtas,
              (item) => item.text
            )
          )
        )
      : [],
    Buttons: [],
  };
}

export function normalizeCarouselDraft(
  parsed: LlmCarouselOutput,
  ctaDefaults?: CarouselCtaDefaults,
  existingCards?: CarouselDraftCard[],
  buttonDefaults?: KeyboardButtonDefaults
): CarouselDraft {
  const ctaTheme = resolveCtaDefaults(ctaDefaults);
  const buttonTheme = resolveButtonDefaults(buttonDefaults);
  const sourceCards = existingCards ?? [];
  const unusedExisting = [...sourceCards];
  const groupColumns = pickClamped(parsed.ButtonsGroupColumns, 1, 6, undefined, 6);
  const groupRows = pickClamped(parsed.ButtonsGroupRows, 1, 7, undefined, 7);
  return {
    humanReadableName:
      typeof parsed.humanReadableName === "string"
        ? parsed.humanReadableName.trim().slice(0, 100)
        : "",
    BgColor:
      typeof parsed.BgColor === "string" && HEX_COLOR_6_OR_8.test(parsed.BgColor)
        ? parsed.BgColor
        : null,
    ButtonsGroupColumns: groupColumns,
    ButtonsGroupRows: groupRows,
    Cards: Array.isArray(parsed.Cards)
      ? parsed.Cards.map((card) =>
          normalizeCard(
            card,
            ctaTheme,
            buttonTheme,
            groupColumns,
            groupRows,
            matchExistingCard(card, unusedExisting, sourceCards)
          )
        )
      : [],
  };
}

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function computeMissingFields(draft: CarouselDraft): string[] {
  const missing: string[] = [];
  if (!draft.humanReadableName) {
    missing.push("Carousel name (required)");
  }
  if (draft.Cards.length === 0) {
    missing.push("At least one card is required");
  }
  draft.Cards.forEach((card, i) => {
    const label = cardLabel(card, i);
    if (card.mode === "custom") {
      if (card.Buttons.length === 0) {
        missing.push(`Card ${label}: custom card must have at least one button`);
      }
      const usedRows = simulateCardRows(card.Buttons, draft.ButtonsGroupColumns);
      if (card.Buttons.length > 0 && usedRows !== draft.ButtonsGroupRows) {
        missing.push(
          `Card ${label}: buttons fill ${usedRows} of ${draft.ButtonsGroupRows} rows — every custom card must fill the block exactly`
        );
      }
      card.Buttons.forEach((btn, j) => {
        const btnLabel = btn.Text.trim() ? `"${btn.Text.trim()}"` : `#${j + 1}`;
        if (btn.isJson && btn.ActionType === "reply") {
          const payload = parseJsonObject(btn.ActionBody);
          if (!payload || typeof payload.trigger !== "string" || !payload.trigger.trim()) {
            missing.push(`Card ${label}, button ${btnLabel}: JSON trigger (ActionBody.trigger)`);
          }
        } else if (
          !btn.ActionBody &&
          (btn.ActionType === "reply" || btn.ActionType === "open-url")
        ) {
          missing.push(
            btn.ActionType === "reply"
              ? `Card ${label}, button ${btnLabel}: reply text (ActionBody)`
              : `Card ${label}, button ${btnLabel}: URL to open (ActionBody)`
          );
        }
        if (
          btn.ActionType === "open-url" &&
          btn.ActionBody &&
          !isValidHttpUrl(btn.ActionBody)
        ) {
          missing.push(
            `Card ${label}, button ${btnLabel}: ActionBody must be a valid http(s) URL`
          );
        }
        if (btn.BgMedia && !isValidHttpUrl(btn.BgMedia)) {
          missing.push(
            `Card ${label}, button ${btnLabel}: BgMedia must be a valid http(s) URL`
          );
        }
      });
      return;
    }

    const hasText = Boolean(card.title.trim() || card.description.trim());
    if (!card.image && !hasText && card.ctaButtons.length === 0) {
      missing.push(`Card ${label}: add an image, text, or at least one button`);
    }
    if (card.image && !isValidHttpUrl(card.image)) {
      missing.push(`Card ${label}: image must be a valid http(s) URL`);
    }
    const textRows = hasText ? card.textRows : 0;
    if (
      card.image &&
      draft.ButtonsGroupRows - textRows - card.ctaButtons.length < 1
    ) {
      missing.push(
        `Card ${label}: no rows left for the image — reduce text rows or CTA buttons`
      );
    }
    card.ctaButtons.forEach((cta, j) => {
      const ctaLabel = cta.text.trim() ? `"${cta.text.trim()}"` : `#${j + 1}`;
      if (cta.actionType !== "none" && !cta.actionBody) {
        missing.push(
          cta.actionType === "reply"
            ? `Card ${label}, button ${ctaLabel}: reply text (actionBody)`
            : `Card ${label}, button ${ctaLabel}: URL to open (actionBody)`
        );
      }
      if (
        cta.actionType === "open-url" &&
        cta.actionBody &&
        !isValidHttpUrl(cta.actionBody)
      ) {
        missing.push(`Card ${label}, button ${ctaLabel}: actionBody must be a valid http(s) URL`);
      }
    });
  });
  return missing;
}

function cardLabel(card: CarouselDraftCard, index: number): string {
  if (card.title.trim()) return `"${card.title.trim()}"`;
  const buttonText = firstButtonText(card);
  if (buttonText.trim()) return `"${buttonText.trim()}"`;
  return `#${index + 1}`;
}
