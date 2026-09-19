import type {
  GenerateKeyboardInput,
  KeyboardDraft,
} from "../../ports/in/BuildKeyboardUseCase";
import { appendAvailableSteps } from "./availableStepsPrompt";

/**
 * Few-shot examples appended to the system prompt (declared first — the
 * system prompt template literal interpolates it at module init).
 * Example 1 (Bulgarian): balanced Columns math (4 buttons → 2 rows of 3+3) and
 * unknown required values left blank ("" name, "" reply ActionBody).
 * Example 2 (English): open-url button with explicit URL and colors.
 * Example 3 (English): JSON reply payload — isJson true, trigger + a named prop.
 * Example 5 (English): catalog lookup — exact name or paraphrase → first trigger.
 */
const KEYBOARD_BUILDER_FEW_SHOT_EXAMPLES = `Examples:

Example 1
Description: "Меню с бутони Цени, Локации, Контакти и За нас"
Output:
{"humanReadableName":"","title":null,"InputFieldState":"hidden","BgColor":null,
 "Buttons":[
  {"Columns":3,"Rows":1,"Text":"Цени","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"},
  {"Columns":3,"Rows":1,"Text":"Локации","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"},
  {"Columns":3,"Rows":1,"Text":"Контакти","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"},
  {"Columns":3,"Rows":1,"Text":"За нас","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"}],
 "summary":"Клавиатура с 4 бутона в 2 реда по 2. Името на клавиатурата и отговорите на бутоните не са посочени."}
(Note: the user gave neither a keyboard name nor reply payloads, so humanReadableName and every ActionBody are "". Colors are "" / null and Frame is omitted so the admin button theme — including border and corner radius — is applied.)

Example 2
Description: "Keyboard named Support menu: a green full-width button 'Open docs' that opens https://docs.example.com, and below it a button 'Back' that sends back_to_menu"
Output:
{"humanReadableName":"Support menu","title":null,"InputFieldState":"hidden","BgColor":null,
 "Buttons":[
  {"Columns":6,"Rows":1,"Text":"Open docs","TextColor":"#FFFFFF","BgColor":"#2E7D32","ActionType":"open-url","ActionBody":"https://docs.example.com","isJson":false,"OpenURLType":"external"},
  {"Columns":6,"Rows":1,"Text":"Back","TextColor":"#FFFFFF","BgColor":null,"ActionType":"reply","ActionBody":"back_to_menu","isJson":false,"OpenURLType":"internal"}],
 "summary":"Support menu keyboard with a full-width green docs link and a Back reply button."}

Example 3
Description: "A full-width button Start with a JSON action body that triggers welcome and set click: now as a prop"
Output:
{"humanReadableName":"","title":null,"InputFieldState":"hidden","BgColor":null,
 "Buttons":[
  {"Columns":6,"Rows":1,"Text":"Start","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":{"trigger":"welcome","click":"now"},"isJson":true,"OpenURLType":"internal"}],
 "summary":"One full-width Start button. Its JSON payload opens the welcome trigger and sets the click user-state property to now."}
(Note: isJson is true and ActionBody is the object — not the bare string "welcome". Every named prop is kept. The keyboard name was not given so humanReadableName is "".)

Example 4
Description: "Full-width Pizza button with background image https://cdn.example.com/pizza.jpg fill, and a full-width Order button"
Output:
{"humanReadableName":"","title":null,"InputFieldState":"hidden","BgColor":null,
 "Buttons":[
  {"Columns":6,"Rows":2,"Text":"Pizza","TextColor":"","BgColor":null,"BgMedia":"https://cdn.example.com/pizza.jpg","BgMediaType":"picture","BgMediaScaleType":"fill","BgLoop":true,"ActionType":"none","ActionBody":"","isJson":false,"OpenURLType":"internal"},
  {"Columns":6,"Rows":1,"Text":"Order","TextColor":"","BgColor":null,"BgMedia":null,"BgMediaType":"picture","BgMediaScaleType":"fit","BgLoop":true,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"}],
 "summary":"Pizza button uses the given image as background (fill). Order has no reply payload."}
(Note: BgMedia is the URL the user gave. Scale is "fill" because they asked. No image URL → BgMedia is null. Never invent a URL.)

Example 5
Available steps: [{"name":"Welcome","triggers":["welcome","start"]}]
Description: "Full-width Start button that triggers the Welcome step"
Output:
{"humanReadableName":"","title":null,"InputFieldState":"hidden","BgColor":null,
 "Buttons":[
  {"Columns":6,"Rows":1,"Text":"Start","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"welcome","isJson":false,"OpenURLType":"internal"}],
 "summary":"One full-width Start button. Its reply payload is the Welcome step's first trigger."}
(Note: ActionBody is "welcome" — the first trigger — not the name "Welcome".)

Description: "make Start open the greeting / start screen"
Output: same ActionBody "welcome", isJson false
(Note: a paraphrase still maps to the single listed Welcome step.)`;

export const KEYBOARD_BUILDER_SYSTEM_PROMPT = `You are a Viber bot keyboard designer.
You convert a plain-text description into a Viber keyboard draft.

Rules:
- The keyboard grid is 6 columns wide; buttons wrap to a new row when a row exceeds 6 columns.
- Each button: Columns 1-6, Rows 1-2.
- ActionType is one of: reply, open-url, location-picker, share-phone, none.
- For a plain "reply" button, ActionBody is the exact text sent back by the tap and isJson is false. For "open-url" ActionBody must be a full URL and isJson is false.
- JSON reply payload (isJson): use this when the user asks for a JSON action body, a JSON trigger, "is JSON", or to set a property/prop on the button (e.g. "2nd button JSON action body that triggers welcome and set click: now as a prop"). Then ActionType stays "reply", isJson is true, and ActionBody is ONE object — not a plain trigger string — of the shape {"trigger":"<step trigger>","<prop>":"<value>",...}. "trigger" is required and names the step to open. Every other key is a user-state property: copy the key and value exactly as stated ("set click: now as a prop" → "click":"now"). Include every named prop; never drop them and never invent extras. Putting only "welcome" in ActionBody is WRONG for this request — that is a plain reply. If they ask for JSON with only a trigger and no props, use {"trigger":"<value>"} and still set isJson true.
- Available steps (user prompt): when the user says a button should trigger / open / go to a step, pick the single listed step that matches — exact name, a listed trigger, or a clear paraphrase of that name (e.g. "greeting screen" / "начален екран" → Welcome). Set ActionType "reply", isJson false, ActionBody = that step's FIRST trigger. Do not put the human name in ActionBody. If they asked for JSON / props, use isJson true and {"trigger":"<first trigger>", ...props}. If two listed steps fit equally, or none fit, leave ActionBody "" (or {"trigger":""} for JSON) — do not invent a trigger.
- NEVER invent values the user did not state: if the keyboard name is not given, return "" for humanReadableName; if a plain reply payload or URL is not given, return "" for that ActionBody; if a JSON payload is requested but the trigger is not given, use {"trigger":""} (and still isJson true); if no background-image URL is given, return null for BgMedia — NEVER fabricate an image URL.
- Colors are hex "#RRGGBB". Only set a color the user explicitly asked for.
- Button background media: BgMedia is an http(s) URL the user gave, else null. BgMediaType is "picture" or "gif" (use "gif" only when they said gif or the URL ends in .gif). BgMediaScaleType is "fit", "crop", or "fill" — default "fit" unless they ask (fill / crop / fit / cover / contain). BgLoop is true unless they ask not to loop.
- NEW buttons (not already in Current keyboard state / template): if they did not mention text color or button background, copy TextColor / BgColor from the "Button theme defaults" in the user prompt (or return "" / null so the server fills those defaults). Never invent a different theme.
- EXISTING buttons in Current keyboard state / template: keep their TextColor, BgColor, Frame, BgMedia, BgMediaType, BgMediaScaleType, and BgLoop exactly as given, unless the user asked to change that button's style or media (or all buttons' styles). Do not restyle them with the theme defaults.
- Frame is the button border: BorderWidth 0-10, BorderColor "#RRGGBB", CornerRadius 0-10. For new buttons, if the user did not mention border, outline, or rounding, copy Frame from the theme defaults (or omit Frame / return null so the server fills it). For existing buttons, copy their Frame. Only change Frame when they ask (e.g. "more rounded", "no border", "thick black outline").
- Button Text stays in the language of the description.
- The summary must be written in the same language as the description.
- Prefer balanced layouts (e.g. 2 buttons per row → Columns 3 each; 3 per row → Columns 2 each).
- If the conversation history contains a keyboard JSON you produced earlier, the newest message is a CHANGE REQUEST: apply only the requested changes to that JSON and keep every other field and button exactly as it was.
- If the user prompt contains a "Current keyboard state" JSON, it is the AUTHORITATIVE base — the user may have edited it manually after your last draft. It takes precedence over any keyboard JSON in the conversation history: apply the requested changes to that exact state and keep every other field and button (including humanReadableName, title, and colors) exactly as given there.

Respond with ONLY a JSON object (no markdown, no code fences) of this exact shape:
{ "humanReadableName": string, "title": string|null, "InputFieldState": "regular"|"minimized"|"hidden",
  "BgColor": string|null, "Buttons": [ { "Columns": number, "Rows": number, "Text": string,
  "TextColor": string, "BgColor": string|null,
  "BgMedia": string|null, "BgMediaType": "picture"|"gif", "BgMediaScaleType": "fit"|"crop"|"fill", "BgLoop": boolean,
  "ActionType": string, "ActionBody": string|object, "isJson": boolean,
  "OpenURLType": "internal"|"external",
  "Frame": { "BorderWidth": number, "BorderColor": string, "CornerRadius": number }|null } ], "summary": string }

${KEYBOARD_BUILDER_FEW_SHOT_EXAMPLES}`;

/** Prefer the parsed object in prompts so the model edits trigger/props, not an escaped string. */
const slimActionBody = (
  b: KeyboardDraft["Buttons"][number]
): string | Record<string, unknown> => {
  if (!b.isJson || typeof b.ActionBody !== "string" || !b.ActionBody.trim()) {
    return b.ActionBody;
  }
  try {
    const parsed: unknown = JSON.parse(b.ActionBody);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // keep the raw string — normalizer will wrap or flag it
  }
  return b.ActionBody;
};

/** Reduce a draft button to the slim shape used in prompts and history turns. */
const slimButton = (b: KeyboardDraft["Buttons"][number]) => ({
  Columns: b.Columns,
  Rows: b.Rows,
  Text: b.Text,
  TextColor: b.TextColor,
  BgColor: b.BgColor,
  BgMedia: b.BgMedia,
  BgMediaType: b.BgMediaType,
  BgMediaScaleType: b.BgMediaScaleType,
  BgLoop: b.BgLoop,
  ActionType: b.ActionType,
  ActionBody: slimActionBody(b),
  isJson: b.isJson,
  OpenURLType: b.OpenURLType,
  Frame: b.Frame,
});

export function buildKeyboardUserPrompt(input: GenerateKeyboardInput): string {
  const parts = [`Keyboard description:\n${input.description}`];
  appendAvailableSteps(parts, input.availableSteps);
  if (input.buttonDefaults) {
    parts.push(
      `Button theme defaults (use these only for newly added buttons, unless the description asks for different colors or frame):\n${JSON.stringify(
        {
          TextColor: input.buttonDefaults.TextColor,
          BgColor: input.buttonDefaults.BgColor,
          Frame: input.buttonDefaults.Frame, // { BorderWidth, BorderColor, CornerRadius } or null
        },
        null,
        2
      )}`
    );
  }
  if (input.currentDraft) {
    parts.push(
      `Current keyboard state (the user may have edited it manually after your last draft). Treat the description above as a change request against this exact state and keep everything else unchanged — including each existing button's TextColor, BgColor, Frame, BgMedia, BgMediaType, BgMediaScaleType, and BgLoop. Apply button theme defaults only to newly added buttons:\n${JSON.stringify(
        {
          humanReadableName: input.currentDraft.humanReadableName,
          title: input.currentDraft.title,
          InputFieldState: input.currentDraft.InputFieldState,
          BgColor: input.currentDraft.BgColor,
          Buttons: input.currentDraft.Buttons.map(slimButton),
        },
        null,
        2
      )}`
    );
  } else if (input.templateButtons && input.templateButtons.length > 0) {
    parts.push(
      `Start from this template layout and modify it to match the description. Keep each existing template button's TextColor, BgColor, Frame, BgMedia, BgMediaType, BgMediaScaleType, and BgLoop unless the description asks to change them. Apply button theme defaults only to newly added buttons:\n${JSON.stringify(
        input.templateButtons.map(slimButton),
        null,
        2
      )}`
    );
  }
  return parts.join("\n\n");
}

/**
 * Serialize a normalized draft back to the reduced LLM shape.
 * Returned as `assistantMessage`; the client stores it as the assistant
 * history turn so follow-up requests refine this exact draft.
 */
export function serializeDraftForHistory(
  draft: KeyboardDraft,
  summary: string
): string {
  return JSON.stringify({
    humanReadableName: draft.humanReadableName,
    title: draft.title,
    InputFieldState: draft.InputFieldState,
    BgColor: draft.BgColor,
    Buttons: draft.Buttons.map(slimButton),
    summary,
  });
}
