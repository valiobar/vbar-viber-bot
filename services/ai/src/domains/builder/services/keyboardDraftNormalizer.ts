import type {
  AvailableStep,
  KeyboardButtonDefaults,
  KeyboardDraft,
  KeyboardDraftButton,
} from "@vbar/shared";
import type { LlmKeyboardOutput } from "./llmOutputSchemas";
import { resolveReplyActionBody } from "./stepTriggerResolver";
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
} from "./normalizerPrimitives";

const ACTION_TYPES = [
  "reply",
  "open-url",
  "location-picker",
  "share-phone",
  "none",
];
const INPUT_FIELD_STATES = ["regular", "minimized", "hidden"];

export function parseLlmKeyboardJson(raw: string): LlmKeyboardOutput {
  return extractJsonObject<LlmKeyboardOutput>(raw);
}

/** Same fallbacks as admin FALLBACK_BUTTON_TEXT_COLOR / resolveButtonFrame. */
const HARDCODED_DEFAULTS: KeyboardButtonDefaults = {
  TextColor: "#000000",
  BgColor: null,
  Frame: null,
};

function resolveDefaults(defaults?: KeyboardButtonDefaults): KeyboardButtonDefaults {
  return {
    TextColor: hexOrNull(defaults?.TextColor) ?? HARDCODED_DEFAULTS.TextColor,
    BgColor: hexOrNull(defaults?.BgColor) ?? HARDCODED_DEFAULTS.BgColor,
    Frame: defaults?.Frame ?? HARDCODED_DEFAULTS.Frame,
  };
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

/**
 * JSON reply payload: { trigger, ...userStateProps }.
 * Honors isJson, accepts ActionBody as an object or a JSON string, and wraps a
 * plain trigger string when the model flagged isJson but forgot the object.
 */
function normalizeReplyAction(
  raw: unknown,
  isJsonFlag: unknown,
  actionType: KeyboardDraftButton["ActionType"]
): { ActionBody: string; isJson: boolean } {
  const flaggedJson = isJsonFlag === true && actionType === "reply";
  const asObj = asJsonObject(raw);
  const looksJson =
    actionType === "reply" &&
    asObj !== null &&
    typeof asObj.trigger === "string";

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

/** Consume the first unused existing button with the same label. */
function takeExistingButton(
  text: string,
  unused: KeyboardDraftButton[]
): KeyboardDraftButton | undefined {
  const needle = text.trim();
  if (!needle) return undefined;
  const idx = unused.findIndex((b) => b.Text.trim() === needle);
  if (idx === -1) return undefined;
  return unused.splice(idx, 1)[0];
}

/** Same-label unused first, then an already-consumed same-label button (duplicate). */
function matchExistingButton(
  text: string,
  unused: KeyboardDraftButton[],
  all: readonly KeyboardDraftButton[]
): KeyboardDraftButton | undefined {
  const consumed = takeExistingButton(text, unused);
  if (consumed) return consumed;
  const needle = text.trim();
  if (needle) {
    const duplicate = all.find((b) => b.Text.trim() === needle);
    if (duplicate) return duplicate;
  }
  // Rename / reorder: leftover unused button in this slot is the same button.
  return unused.shift();
}

const STYLE_REQUEST =
  /#[0-9a-f]{3,8}\b|\b(?:colou?rs?|backgrounds?|bgcolor|textcolor|frames?|borders?|outlines?|rounded|rounding|radius|recolou?r|restyle|re-style|white|black|red|green|blue|yellow|orange|purple|pink|gre[ya]|violet)\b|цвят|цвета|цветове|фон(?:а|ът)?|рамк(?:а|ата|и)|границ(?:а|ата)|заоблен\w*|бял\w*|черн\w*|зелен\w*|син\w*|жълт\w*|лилав\w*|розов\w*|сив\w*/i;

/** True when the user asked to change colors, frame, or other button visuals. */
export const mentionsButtonStyle = (description?: string): boolean =>
  Boolean(description && STYLE_REQUEST.test(description));

/** Same visual defaults as admin getDefaultButton (KeyboardForm.tsx), using bot settings. */
function normalizeButton(
  b: Partial<LlmKeyboardOutput["Buttons"][number]>,
  defaults: KeyboardButtonDefaults,
  existing?: KeyboardDraftButton,
  availableSteps?: AvailableStep[],
  allowRestyle = false
): KeyboardDraftButton {
  const actionType = ACTION_TYPES.includes(String(b.ActionType))
    ? (b.ActionType as KeyboardDraftButton["ActionType"])
    : (existing?.ActionType ?? "reply");
  const llmProvidedAction =
    (typeof b.ActionBody === "string" && b.ActionBody.trim().length > 0) ||
    (typeof b.ActionBody === "object" && b.ActionBody !== null) ||
    b.isJson === true;
  let action = llmProvidedAction
    ? normalizeReplyAction(b.ActionBody, b.isJson, actionType)
    : existing
      ? { ActionBody: existing.ActionBody, isJson: existing.isJson }
      : normalizeReplyAction(b.ActionBody, b.isJson, actionType);
  if (actionType === "reply") {
    action = {
      ActionBody: resolveReplyActionBody(action.ActionBody, action.isJson, availableSteps),
      isJson: action.isJson,
    };
  }
  if (actionType === "none" && !action.ActionBody.trim()) {
    // Viber requires a non-empty ActionBody even for none-buttons
    action = { ActionBody: "none", isJson: false };
  }
  const openUrlType =
    b.OpenURLType === "external" || b.OpenURLType === "internal"
      ? b.OpenURLType
      : (existing?.OpenURLType ?? "internal");

  // Text / action refinements must not restyle existing buttons. Color requests
  // still flow through pickHex so an explicit LLM hex wins.
  if (existing && !allowRestyle) {
    return {
      ...existing,
      Columns: pickClamped(b.Columns, 1, 6, existing.Columns, 6),
      Rows: pickClamped(b.Rows, 1, 2, existing.Rows, 1),
      Text: pickNonEmptyString(b.Text, existing.Text, ""),
      ActionType: actionType,
      ...action,
      OpenURLType: openUrlType,
    };
  }

  const bgMedia = pickBgMedia(b.BgMedia, existing?.BgMedia);
  return {
    Columns: pickClamped(b.Columns, 1, 6, existing?.Columns, 6),
    Rows: pickClamped(b.Rows, 1, 2, existing?.Rows, 1),
    Text: pickNonEmptyString(b.Text, existing?.Text, ""),
    TextColor: pickHex(b.TextColor, existing?.TextColor, defaults.TextColor) ?? defaults.TextColor,
    BgColor: pickHex(b.BgColor, existing?.BgColor, defaults.BgColor),
    BgMedia: bgMedia,
    BgMediaType: pickBgMediaType(b.BgMediaType, bgMedia, existing?.BgMediaType),
    BgMediaScaleType: pickBgMediaScaleType(b.BgMediaScaleType, existing?.BgMediaScaleType),
    BgLoop: pickBgLoop(b.BgLoop, existing?.BgLoop),
    ActionType: actionType,
    ...action,
    OpenURLType: openUrlType,
    InternalBrowser: existing?.InternalBrowser ?? { Mode: "fullscreen-portrait" },
    TextVAlign: existing?.TextVAlign ?? "middle",
    TextHAlign: existing?.TextHAlign ?? "center",
    TextSize: existing?.TextSize ?? "regular",
    Silent: existing?.Silent ?? true,
    Frame: pickFrame(b.Frame, existing?.Frame, defaults.Frame),
  };
}

export function normalizeKeyboardDraft(
  parsed: LlmKeyboardOutput,
  defaults?: KeyboardButtonDefaults,
  existingButtons?: KeyboardDraftButton[],
  availableSteps?: AvailableStep[],
  description?: string
): KeyboardDraft {
  const theme = resolveDefaults(defaults);
  const sourceButtons = existingButtons ?? [];
  const unusedExisting = [...sourceButtons];
  const allowRestyle = mentionsButtonStyle(description);
  return {
    humanReadableName:
      typeof parsed.humanReadableName === "string"
        ? parsed.humanReadableName.trim().slice(0, 100)
        : "",
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : null,
    InputFieldState: INPUT_FIELD_STATES.includes(String(parsed.InputFieldState))
      ? (parsed.InputFieldState as KeyboardDraft["InputFieldState"])
      : "hidden",
    BgColor: hexOrNull(parsed.BgColor),
    Buttons: Array.isArray(parsed.Buttons)
      ? parsed.Buttons.map((b) =>
          normalizeButton(
            b,
            theme,
            matchExistingButton(
              typeof b.Text === "string" ? b.Text : "",
              unusedExisting,
              sourceButtons
            ),
            availableSteps,
            allowRestyle
          )
        )
      : [],
  };
}

export function computeMissingFields(draft: KeyboardDraft): string[] {
  const missing: string[] = [];
  if (!draft.humanReadableName) {
    missing.push("Keyboard name (required)");
  }
  if (draft.Buttons.length === 0) {
    missing.push("At least one button is required");
  }
  draft.Buttons.forEach((btn, i) => {
    const label = btn.Text ? `"${btn.Text}"` : `#${i + 1}`;
    if (btn.isJson && btn.ActionType === "reply") {
      const payload = parseJsonObject(btn.ActionBody);
      if (!payload || typeof payload.trigger !== "string" || !payload.trigger.trim()) {
        missing.push(`Button ${label}: JSON trigger (ActionBody.trigger)`);
      }
    } else if (
      !btn.ActionBody &&
      (btn.ActionType === "reply" || btn.ActionType === "open-url")
    ) {
      missing.push(
        btn.ActionType === "reply"
          ? `Button ${label}: reply text (ActionBody)`
          : `Button ${label}: URL to open (ActionBody)`
      );
    }
    if (btn.ActionType === "open-url" && btn.ActionBody && !/^https?:\/\//i.test(btn.ActionBody)) {
      missing.push(`Button ${label}: ActionBody must be a valid http(s) URL`);
    }
    if (btn.BgMedia && !/^https?:\/\//i.test(btn.BgMedia)) {
      missing.push(`Button ${label}: BgMedia must be a valid http(s) URL`);
    }
  });
  return missing;
}
