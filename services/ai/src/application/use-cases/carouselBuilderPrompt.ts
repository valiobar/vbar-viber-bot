import { z } from "zod";
import type { CarouselDraft, GenerateCarouselInput } from "../../ports/in/BuildCarouselUseCase";
import { appendAvailableSteps } from "./availableStepsPrompt";

const llmButtonFrameSchema = z
  .object({
    BorderWidth: z.number(),
    BorderColor: z.string(),
    CornerRadius: z.number(),
  })
  .nullable()
  .optional();

const llmCustomButtonSchema = z.object({
  Columns: z.number(), // normalizer clamps 1-ButtonsGroupColumns
  Rows: z.number(), // normalizer clamps 1-ButtonsGroupRows
  Text: z.string(),
  TextColor: z.string(), // "" → buttonDefaults
  BgColor: z.string().nullable(),
  BgMedia: z.string().nullable().optional(), // http(s) URL or null; never invent
  BgMediaType: z.string().optional(), // picture | gif
  BgMediaScaleType: z.string().optional(), // fit | crop | fill
  BgLoop: z.boolean().optional(),
  ActionType: z.string(), // reply | open-url | none (not location-picker / share-phone)
  ActionBody: z.union([z.string(), z.record(z.unknown())]),
  isJson: z.boolean().optional(),
  OpenURLType: z.string(),
  Frame: llmButtonFrameSchema,
});

/** Permissive reduced shape — business rules enforced by the normalizer. */
export const llmCarouselOutputSchema = z.object({
  humanReadableName: z.string(), // "" if not stated by the user
  BgColor: z.string().nullable(),
  ButtonsGroupColumns: z.number(), // normalizer clamps 1-6
  ButtonsGroupRows: z.number(), // normalizer clamps 1-7
  Cards: z.array(
    z.object({
      mode: z.string().optional(), // "custom" (default) | "structured"
      image: z.string().nullable(), // structured only; null unless the user gave a URL
      title: z.string(),
      titleColor: z.string(), // "" → normalizer default #323232
      description: z.string(),
      descriptionColor: z.string(), // "" → normalizer default #777777
      textRows: z.number(), // structured; normalizer clamps 1-3
      ctaButtons: z
        .array(
          z.object({
            text: z.string(),
            textColor: z.string(), // "" → ctaDefaults
            bgColor: z.string().nullable(),
            actionType: z.string(), // reply|open-url|none
            actionBody: z.string(),
            openURLType: z.string(),
            Frame: llmButtonFrameSchema,
          })
        )
        .optional(),
      Buttons: z.array(llmCustomButtonSchema).optional(),
    })
  ),
  summary: z.string(),
});

export type LlmCarouselOutput = z.infer<typeof llmCarouselOutputSchema>;

const CAROUSEL_BUILDER_FEW_SHOT_EXAMPLES = `Examples:

Example 1 (default — custom cards)
Description: "Карусел с 3 карти: Пица, Паста и Салата, всяка с бутон Поръчай"
Output:
{"humanReadableName":"","BgColor":null,"ButtonsGroupColumns":6,"ButtonsGroupRows":7,
 "Cards":[
  {"mode":"custom","image":null,"title":"","titleColor":"","description":"","descriptionColor":"","textRows":2,"ctaButtons":[],
   "Buttons":[
    {"Columns":6,"Rows":6,"Text":"Пица","TextColor":"","BgColor":null,"ActionType":"none","ActionBody":"","isJson":false,"OpenURLType":"internal"},
    {"Columns":6,"Rows":1,"Text":"Поръчай","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"}]},
  {"mode":"custom","image":null,"title":"","titleColor":"","description":"","descriptionColor":"","textRows":2,"ctaButtons":[],
   "Buttons":[
    {"Columns":6,"Rows":6,"Text":"Паста","TextColor":"","BgColor":null,"ActionType":"none","ActionBody":"","isJson":false,"OpenURLType":"internal"},
    {"Columns":6,"Rows":1,"Text":"Поръчай","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"}]},
  {"mode":"custom","image":null,"title":"","titleColor":"","description":"","descriptionColor":"","textRows":2,"ctaButtons":[],
   "Buttons":[
    {"Columns":6,"Rows":6,"Text":"Салата","TextColor":"","BgColor":null,"ActionType":"none","ActionBody":"","isJson":false,"OpenURLType":"internal"},
    {"Columns":6,"Rows":1,"Text":"Поръчай","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"}]}],
 "summary":"Карусел с 3 custom карти (Пица, Паста, Салата), всяка с етикет и бутон Поръчай. Името и отговорите на бутоните не са посочени."}
(Note: default mode is custom. Buttons on each card fill 6+1 = 7 rows exactly. No carousel name and no reply payloads, so humanReadableName and action ActionBody are "". Colors are "" / null and Frame is omitted so the admin button theme is applied.)

Example 2 (structured — only because the user gave images + title/description layout)
Description: "Carousel named Summer offers with 2 cards: Beach towel with image https://cdn.example.com/towel.jpg and a Buy button opening https://shop.example.com/towel, and Sunglasses with image https://cdn.example.com/sun.jpg and a Buy button opening https://shop.example.com/sun"
Output:
{"humanReadableName":"Summer offers","BgColor":null,"ButtonsGroupColumns":6,"ButtonsGroupRows":7,
 "Cards":[
  {"mode":"structured","image":"https://cdn.example.com/towel.jpg","title":"Beach towel","titleColor":"","description":"","descriptionColor":"","textRows":1,
   "ctaButtons":[{"text":"Buy","textColor":"","bgColor":null,"actionType":"open-url","actionBody":"https://shop.example.com/towel","openURLType":"external"}],
   "Buttons":[]},
  {"mode":"structured","image":"https://cdn.example.com/sun.jpg","title":"Sunglasses","titleColor":"","description":"","descriptionColor":"","textRows":1,
   "ctaButtons":[{"text":"Buy","textColor":"","bgColor":null,"actionType":"open-url","actionBody":"https://shop.example.com/sun","openURLType":"external"}],
   "Buttons":[]}],
 "summary":"Summer offers carousel with 2 structured image cards, each with a Buy link."}
(Note: structured only because the user supplied image URLs and a title + CTA layout. textRows is 1 so the image gets 7 - 1 - 1 = 5 rows.)

Example 3 (duplicate a custom card — refinement against Current carousel state)
Current carousel state: {"humanReadableName":"Меню","BgColor":null,"ButtonsGroupColumns":6,"ButtonsGroupRows":7,"Cards":[{"mode":"custom","image":null,"title":"","titleColor":"#323232","description":"","descriptionColor":"#777777","textRows":2,"ctaButtons":[],"Buttons":[{"Columns":6,"Rows":3,"Text":"Пица","TextColor":"#B22222","BgColor":"#1E1E1E","ActionType":"reply","ActionBody":"order_pizza","isJson":false,"OpenURLType":"internal","Frame":{"BorderWidth":2,"BorderColor":"#FFD700","CornerRadius":6}},{"Columns":6,"Rows":4,"Text":"Поръчай","TextColor":"#FFD700","BgColor":"#1E1E1E","ActionType":"reply","ActionBody":"order_pizza","isJson":false,"OpenURLType":"internal","Frame":{"BorderWidth":2,"BorderColor":"#FFD700","CornerRadius":6}}]}]}
Description: "Дублирай първата карта"
Output:
{"humanReadableName":"Меню","BgColor":null,"ButtonsGroupColumns":6,"ButtonsGroupRows":7,
 "Cards":[
  {"mode":"custom","image":null,"title":"","titleColor":"#323232","description":"","descriptionColor":"#777777","textRows":2,"ctaButtons":[],
   "Buttons":[{"Columns":6,"Rows":3,"Text":"Пица","TextColor":"#B22222","BgColor":"#1E1E1E","ActionType":"reply","ActionBody":"order_pizza","isJson":false,"OpenURLType":"internal","Frame":{"BorderWidth":2,"BorderColor":"#FFD700","CornerRadius":6}},{"Columns":6,"Rows":4,"Text":"Поръчай","TextColor":"#FFD700","BgColor":"#1E1E1E","ActionType":"reply","ActionBody":"order_pizza","isJson":false,"OpenURLType":"internal","Frame":{"BorderWidth":2,"BorderColor":"#FFD700","CornerRadius":6}}]},
  {"mode":"custom","image":null,"title":"","titleColor":"#323232","description":"","descriptionColor":"#777777","textRows":2,"ctaButtons":[],
   "Buttons":[{"Columns":6,"Rows":3,"Text":"Пица","TextColor":"#B22222","BgColor":"#1E1E1E","ActionType":"reply","ActionBody":"order_pizza","isJson":false,"OpenURLType":"internal","Frame":{"BorderWidth":2,"BorderColor":"#FFD700","CornerRadius":6}},{"Columns":6,"Rows":4,"Text":"Поръчай","TextColor":"#FFD700","BgColor":"#1E1E1E","ActionType":"reply","ActionBody":"order_pizza","isJson":false,"OpenURLType":"internal","Frame":{"BorderWidth":2,"BorderColor":"#FFD700","CornerRadius":6}}]}],
 "summary":"Първата custom карта е дублирана — копието е идентично: mode, Columns, Rows, текстове, цветове, рамки и ActionBody са запазени."}
(Note: the copy and the original are IDENTICAL custom cards. Do NOT convert Buttons into ctaButtons. Do not restyle either card with theme defaults.)

Example 4 (custom card — button background media)
Description: "Custom card Pizza with background image https://cdn.example.com/pizza.jpg fill, and an Order button"
Output:
{"humanReadableName":"","BgColor":null,"ButtonsGroupColumns":6,"ButtonsGroupRows":7,
 "Cards":[
  {"mode":"custom","image":null,"title":"","titleColor":"","description":"","descriptionColor":"","textRows":2,"ctaButtons":[],
   "Buttons":[
    {"Columns":6,"Rows":6,"Text":"Pizza","TextColor":"","BgColor":null,"BgMedia":"https://cdn.example.com/pizza.jpg","BgMediaType":"picture","BgMediaScaleType":"fill","BgLoop":true,"ActionType":"none","ActionBody":"","isJson":false,"OpenURLType":"internal"},
    {"Columns":6,"Rows":1,"Text":"Order","TextColor":"","BgColor":null,"BgMedia":null,"BgMediaType":"picture","BgMediaScaleType":"fit","BgLoop":true,"ActionType":"reply","ActionBody":"","isJson":false,"OpenURLType":"internal"}]}],
 "summary":"Custom Pizza card: the label button uses the given image as background (fill). Order has no reply payload."}
(Note: stay in custom mode. A button background image is Buttons[].BgMedia — not card.image. Scale is "fill" because the user asked. No image URL → BgMedia is null. Never invent a URL.)

Example 5
Available steps: [{"name":"Welcome","triggers":["welcome","start"]}]
Description: "Custom card Pizza with an Order button that triggers the Welcome step"
Output:
{"humanReadableName":"","BgColor":null,"ButtonsGroupColumns":6,"ButtonsGroupRows":7,
 "Cards":[
  {"mode":"custom","image":null,"title":"","titleColor":"","description":"","descriptionColor":"","textRows":2,"ctaButtons":[],
   "Buttons":[
    {"Columns":6,"Rows":6,"Text":"Pizza","TextColor":"","BgColor":null,"ActionType":"none","ActionBody":"","isJson":false,"OpenURLType":"internal"},
    {"Columns":6,"Rows":1,"Text":"Order","TextColor":"","BgColor":null,"ActionType":"reply","ActionBody":"welcome","isJson":false,"OpenURLType":"internal"}]}],
 "summary":"Custom Pizza card with an Order button. The Order reply payload is the Welcome step's first trigger."}
(Note: the Order button has ActionType "reply", ActionBody "welcome", isJson false — the first trigger, not the name "Welcome".)`;

export const CAROUSEL_BUILDER_SYSTEM_PROMPT = `You are a Viber bot rich-media carousel designer.
You convert a plain-text description into a carousel draft: a horizontal strip of equally sized cards.

Rules:
- Every card shares the same grid: ButtonsGroupColumns wide (1-6, keep 6 unless the user asks) and ButtonsGroupRows tall (1-7, keep 7 unless the user asks).
- DEFAULT MODE IS CUSTOM. New cards are mode "custom" with a free button grid in Buttons. Use mode "structured" only when the user asks for a title + description + CTA layout (or a card-top photo in that layout), or when an existing card in Current carousel state is already structured and they did not ask to convert it. A background image / fill / crop / fit on a custom card or button is NOT structured — stay custom and put the URL on that button's BgMedia.
- CUSTOM card: Buttons is a keyboard-like grid. Each button: Columns 1-ButtonsGroupColumns, Rows 1-ButtonsGroupRows. Buttons wrap left-to-right. The buttons on a card MUST fill ButtonsGroupRows exactly (used rows = ButtonsGroupRows). Prefer a large label button on top and 1-row action button(s) at the bottom (e.g. 6+1 on a 7-row card). ctaButtons is [] and card-level image is null. ActionType is reply, open-url, or none — never location-picker or share-phone. For "reply" ActionBody is the tap payload; for "open-url" it is a full URL; for "none" it stays "".
- Available steps (user prompt): when the user says a custom button or structured CTA should trigger / open / go to a step, pick the single listed step (exact name, listed trigger, or a clear paraphrase). Custom reply: ActionType "reply", isJson false, ActionBody = FIRST trigger (JSON / props → isJson true and {"trigger":"<first trigger>", ...}). Structured CTA: actionType "reply", actionBody = that same trigger string (no isJson on CTAs). Never put the human name in the body. If two steps fit equally or none fit, leave the body "".
- CUSTOM button background media: BgMedia is an http(s) URL the user gave, else null — NEVER invent a URL. BgMediaType is "picture" or "gif" (use "gif" only when they said gif or the URL ends in .gif). BgMediaScaleType is "fit", "crop", or "fill" — default "fit" unless they ask (fill / crop / fit / cover / contain). BgLoop is true unless they ask not to loop. Put the image on the button they named (usually the large top label).
- STRUCTURED card: optional image at the top (card.image), then title/description (textRows 1-3), then ctaButtons (each one full-width row). Buttons is []. Row budget: when a card has an image, textRows + CTA count must leave at least 1 row for the image.
- NEVER invent values the user did not state: if the carousel name is not given, return "" for humanReadableName; if a reply payload or URL is not given, return "" for that ActionBody / actionBody; if no image URL is given, return null for image and for each button's BgMedia — NEVER fabricate an image URL.
- Colors are hex "#RRGGBB". Only set a color the user explicitly asked for.
- NEW custom buttons: if they did not mention text color or background, return "" / null so the server fills the button theme defaults. NEW structured CTAs: same with the CTA theme defaults. titleColor / descriptionColor default to "#323232" / "#777777" — return "" unless asked.
- EXISTING cards: keep mode. For custom cards, copy every Button (Columns, Rows, Text, TextColor, BgColor, BgMedia, BgMediaType, BgMediaScaleType, BgLoop, ActionType, ActionBody, isJson, OpenURLType, Frame) verbatim. For structured cards, copy titleColor, descriptionColor, and each CTA's textColor, bgColor, and Frame. Do not convert a custom card into structured (Buttons → ctaButtons) unless the user explicitly asked. Do not restyle existing items with theme defaults unless they asked to restyle that card/button (or all cards).
- DUPLICATE / MIRROR / COPY: deep-copy EVERY property from the source, including mode, BgMedia / scale / loop on custom Buttons, and the full Buttons[] or ctaButtons[]. Do not restyle the source or the copy. A clone is not a "new" card for theming.
- Frame is the button/CTA border: BorderWidth 0-10, BorderColor "#RRGGBB", CornerRadius 0-10. For new items omit Frame / return null unless they ask. For existing and duplicated items, copy Frame.
- Card text stays in the language of the description. The summary must be written in the same language as the description.
- If the conversation history contains a carousel JSON you produced earlier, the newest message is a CHANGE REQUEST: apply only the requested changes and keep every other card and field exactly as it was.
- If the user prompt contains a "Current carousel state" JSON, it is the AUTHORITATIVE base — the user may have edited it manually after your last draft. It takes precedence over any carousel JSON in the conversation history.

Respond with ONLY a JSON object (no markdown, no code fences) of this exact shape:
{ "humanReadableName": string, "BgColor": string|null, "ButtonsGroupColumns": number, "ButtonsGroupRows": number,
  "Cards": [ { "mode": "custom"|"structured", "image": string|null, "title": string, "titleColor": string,
  "description": string, "descriptionColor": string, "textRows": number,
  "ctaButtons": [ { "text": string, "textColor": string, "bgColor": string|null, "actionType": string,
  "actionBody": string, "openURLType": "internal"|"external",
  "Frame": { "BorderWidth": number, "BorderColor": string, "CornerRadius": number }|null } ],
  "Buttons": [ { "Columns": number, "Rows": number, "Text": string, "TextColor": string, "BgColor": string|null,
  "BgMedia": string|null, "BgMediaType": "picture"|"gif", "BgMediaScaleType": "fit"|"crop"|"fill", "BgLoop": boolean,
  "ActionType": string, "ActionBody": string|object, "isJson": boolean, "OpenURLType": "internal"|"external",
  "Frame": { "BorderWidth": number, "BorderColor": string, "CornerRadius": number }|null } ] } ], "summary": string }

${CAROUSEL_BUILDER_FEW_SHOT_EXAMPLES}`;

const slimCustomButton = (b: CarouselDraft["Cards"][number]["Buttons"][number]) => ({
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
  ActionBody: b.ActionBody,
  isJson: b.isJson,
  OpenURLType: b.OpenURLType,
  Frame: b.Frame,
});

/** Reduce a draft card to the slim shape used in prompts and history turns. */
const slimCard = (card: CarouselDraft["Cards"][number]) => ({
  mode: card.mode,
  image: card.image,
  title: card.title,
  titleColor: card.titleColor,
  description: card.description,
  descriptionColor: card.descriptionColor,
  textRows: card.textRows,
  ctaButtons: card.ctaButtons.map((cta) => ({
    text: cta.text,
    textColor: cta.textColor,
    bgColor: cta.bgColor,
    actionType: cta.actionType,
    actionBody: cta.actionBody,
    openURLType: cta.openURLType,
    Frame: cta.Frame,
  })),
  Buttons: card.Buttons.map(slimCustomButton),
});

export function buildCarouselUserPrompt(input: GenerateCarouselInput): string {
  const parts = [`Carousel description:\n${input.description}`];
  appendAvailableSteps(parts, input.availableSteps);
  if (input.buttonDefaults) {
    parts.push(
      `Custom-card button theme defaults (use these only for newly added custom Buttons, unless the description asks for different colors or frame):\n${JSON.stringify(
        {
          TextColor: input.buttonDefaults.TextColor,
          BgColor: input.buttonDefaults.BgColor,
          Frame: input.buttonDefaults.Frame,
        },
        null,
        2
      )}`
    );
  }
  if (input.ctaDefaults) {
    parts.push(
      `Structured CTA theme defaults (use these only for newly added structured cards and CTAs, unless the description asks for different colors or frame):\n${JSON.stringify(
        {
          textColor: input.ctaDefaults.textColor,
          bgColor: input.ctaDefaults.bgColor,
          Frame: input.ctaDefaults.Frame,
        },
        null,
        2
      )}`
    );
  }
  if (input.currentDraft) {
    parts.push(
      `Current carousel state (the user may have edited it manually after your last draft). Treat the description above as a change request against this exact state and keep everything else unchanged — including each card's mode, each custom Button (Columns, Rows, Text, colors, BgMedia, BgMediaType, BgMediaScaleType, BgLoop, Frame, ActionType, ActionBody), and each structured CTA's colors and Frame. If the description asks to duplicate, copy, clone, or mirror a card, clone that item with every property intact and do not convert custom ↔ structured. Apply theme defaults only to newly invented cards and buttons (not clones):\n${JSON.stringify(
        {
          humanReadableName: input.currentDraft.humanReadableName,
          BgColor: input.currentDraft.BgColor,
          ButtonsGroupColumns: input.currentDraft.ButtonsGroupColumns,
          ButtonsGroupRows: input.currentDraft.ButtonsGroupRows,
          Cards: input.currentDraft.Cards.map(slimCard),
        },
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
export function serializeCarouselDraftForHistory(
  draft: CarouselDraft,
  summary: string
): string {
  return JSON.stringify({
    humanReadableName: draft.humanReadableName,
    BgColor: draft.BgColor,
    ButtonsGroupColumns: draft.ButtonsGroupColumns,
    ButtonsGroupRows: draft.ButtonsGroupRows,
    Cards: draft.Cards.map(slimCard),
    summary,
  });
}
