import type {
  KeyboardButtonDefaults,
  KeyboardDraft,
  KeyboardDraftButton,
} from "../../ports/in/BuildKeyboardUseCase";
import type { LlmKeyboardOutput } from "./keyboardBuilderPrompt";

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const ACTION_TYPES = [
  "reply",
  "open-url",
  "location-picker",
  "share-phone",
  "none",
];
const INPUT_FIELD_STATES = ["regular", "minimized", "hidden"];

export function parseLlmKeyboardJson(raw: string): LlmKeyboardOutput {
  // Models sometimes wrap JSON in ```json fences or add prose — extract the outermost object.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1)) as LlmKeyboardOutput;
}

const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(max, Math.max(min, v));
};

const hexOrNull = (v: unknown): string | null =>
  typeof v === "string" && HEX_COLOR.test(v) ? v : null;

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

/** Same visual defaults as admin getDefaultButton (KeyboardForm.tsx), using bot settings. */
function normalizeButton(
  b: Partial<LlmKeyboardOutput["Buttons"][number]>,
  defaults: KeyboardButtonDefaults
): KeyboardDraftButton {
  const actionType = ACTION_TYPES.includes(String(b.ActionType))
    ? (b.ActionType as KeyboardDraftButton["ActionType"])
    : "reply";
  return {
    Columns: clamp(b.Columns, 1, 6, 6),
    Rows: clamp(b.Rows, 1, 2, 1),
    Text: typeof b.Text === "string" ? b.Text : "",
    TextColor: hexOrNull(b.TextColor) ?? defaults.TextColor,
    BgColor: hexOrNull(b.BgColor) ?? defaults.BgColor,
    BgMedia: null,
    BgMediaType: "picture",
    BgMediaScaleType: "fit",
    BgLoop: true,
    ActionType: actionType,
    ...normalizeReplyAction(b.ActionBody, b.isJson, actionType),
    OpenURLType: b.OpenURLType === "external" ? "external" : "internal",
    InternalBrowser: { Mode: "fullscreen-portrait" },
    TextVAlign: "middle",
    TextHAlign: "center",
    TextSize: "regular",
    Silent: true,
    Frame: normalizeFrame(b.Frame, defaults.Frame),
  };
}

function normalizeFrame(
  raw: unknown,
  fallback: KeyboardButtonDefaults["Frame"]
): KeyboardButtonDefaults["Frame"] {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const f = raw as {
    BorderWidth?: unknown;
    BorderColor?: unknown;
    CornerRadius?: unknown;
  };
  const BorderColor = hexOrNull(f.BorderColor);
  if (!BorderColor) {
    return fallback;
  }
  return {
    BorderWidth: clamp(f.BorderWidth, 0, 10, 1),
    BorderColor,
    CornerRadius: clamp(f.CornerRadius, 0, 10, 0),
  };
}

export function normalizeKeyboardDraft(
  parsed: LlmKeyboardOutput,
  defaults?: KeyboardButtonDefaults
): KeyboardDraft {
  const theme = resolveDefaults(defaults);
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
      ? parsed.Buttons.map((b) => normalizeButton(b, theme))
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
  });
  return missing;
}
