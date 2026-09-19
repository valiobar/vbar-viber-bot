/**
 * Keyboard builder assertion script.
 *
 * Run: npx tsx src/scripts/testKeyboardBuilder.ts [--live]
 *
 * Part A always runs (no LLM/env). Part B hits the configured provider
 * when --live is passed.
 */

import assert from "node:assert";
import dotenv from "dotenv";
import { resolveRootEnvPath } from "@vbar/shared/infra";
import { ConsoleLogger } from "@vbar/shared";
import {
  parseLlmKeyboardJson,
  normalizeKeyboardDraft,
  computeMissingFields,
} from "../application/use-cases/keyboardDraftNormalizer";
import { buildKeyboardUserPrompt } from "../application/use-cases/keyboardBuilderPrompt";
import { buildCarouselUserPrompt } from "../application/use-cases/carouselBuilderPrompt";
import {
  resolveTriggerValue,
  resolveReplyActionBody,
} from "../application/use-cases/stepTriggerResolver";

// --- Part A: normalizer assertions (offline) ---
const fenced =
  "```json\n" +
  JSON.stringify({
    humanReadableName: "Main menu",
    title: null,
    InputFieldState: "bogus",
    BgColor: "not-a-color",
    Buttons: [
      {
        Columns: 99,
        Rows: 0,
        Text: "Menu",
        TextColor: "#00FF00",
        BgColor: null,
        ActionType: "reply",
        ActionBody: "menu",
        OpenURLType: "internal",
      },
      {
        Columns: 3,
        Rows: 1,
        Text: "Site",
        TextColor: "bad",
        BgColor: null,
        ActionType: "open-url",
        ActionBody: "",
        OpenURLType: "external",
      },
    ],
    summary: "ok",
  }) +
  "\n```";

const theme = {
  TextColor: "#111111",
  BgColor: "#EEEEEE",
  Frame: { BorderWidth: 1, BorderColor: "#000000", CornerRadius: 10 },
};
const draft = normalizeKeyboardDraft(parseLlmKeyboardJson(fenced), theme);
assert.equal(draft.humanReadableName, "Main menu");
assert.equal(draft.InputFieldState, "hidden"); // invalid enum → default
assert.equal(draft.BgColor, null); // invalid hex → null
assert.equal(draft.Buttons[0].Columns, 6); // 99 → clamped to 6
assert.equal(draft.Buttons[0].Rows, 1); // 0 → clamped to 1
assert.equal(draft.Buttons[0].TextColor, "#00FF00"); // explicit valid hex kept
assert.equal(draft.Buttons[1].TextColor, "#111111"); // invalid hex → buttonDefaults
assert.equal(draft.Buttons[1].BgColor, "#EEEEEE"); // null LLM bg → buttonDefaults
assert.deepEqual(draft.Buttons[0].Frame, theme.Frame); // omitted Frame → buttonDefaults
assert.equal(draft.Buttons[0].isJson, false);

const jsonDraft = normalizeKeyboardDraft(
  parseLlmKeyboardJson(
    JSON.stringify({
      humanReadableName: "Welcome pad",
      title: null,
      InputFieldState: "hidden",
      BgColor: null,
      Buttons: [
        {
          Columns: 6,
          Rows: 1,
          Text: "Start",
          TextColor: "#FFFFFF",
          BgColor: null,
          ActionType: "reply",
          ActionBody: { trigger: "welcome", click: "now" },
          isJson: true,
          OpenURLType: "internal",
        },
        {
          Columns: 6,
          Rows: 1,
          Text: "Menu",
          TextColor: "#FFFFFF",
          BgColor: null,
          ActionType: "reply",
          ActionBody: "welcome",
          isJson: true,
          OpenURLType: "internal",
        },
        {
          Columns: 6,
          Rows: 1,
          Text: "Forgot flag",
          TextColor: "#FFFFFF",
          BgColor: null,
          ActionType: "reply",
          ActionBody: '{"trigger":"prices","lang":"bg"}',
          OpenURLType: "internal",
        },
        {
          Columns: 6,
          Rows: 1,
          Text: "Empty JSON",
          TextColor: "#FFFFFF",
          BgColor: null,
          ActionType: "reply",
          ActionBody: { trigger: "" },
          isJson: true,
          OpenURLType: "internal",
        },
      ],
      summary: "ok",
    })
  )
);
assert.equal(jsonDraft.Buttons[0].isJson, true);
assert.equal(
  jsonDraft.Buttons[0].ActionBody,
  JSON.stringify({ trigger: "welcome", click: "now" })
);
assert.equal(jsonDraft.Buttons[1].isJson, true);
assert.equal(jsonDraft.Buttons[1].ActionBody, JSON.stringify({ trigger: "welcome" }));
assert.equal(jsonDraft.Buttons[2].isJson, true); // inferred from trigger object
assert.equal(
  jsonDraft.Buttons[2].ActionBody,
  JSON.stringify({ trigger: "prices", lang: "bg" })
);
const jsonMissing = computeMissingFields(jsonDraft);
assert.ok(jsonMissing.some((m) => m.includes("Empty JSON") && m.includes("JSON trigger")));
assert.ok(!jsonMissing.some((m) => m.includes("Start")));

const missing = computeMissingFields(draft);
assert.ok(missing.some((m) => m.includes("URL to open"))); // empty open-url ActionBody
assert.ok(!missing.some((m) => m.includes("Keyboard name"))); // name was supplied

const emptyDraft = normalizeKeyboardDraft(
  parseLlmKeyboardJson(
    '{"humanReadableName":"","title":null,"InputFieldState":"hidden","BgColor":null,"Buttons":[],"summary":""}'
  )
);
assert.deepEqual(computeMissingFields(emptyDraft), [
  "Keyboard name (required)",
  "At least one button is required",
]);

// Existing template / form buttons keep their own styles; defaults apply only to new ones.
const templateButton = {
  Columns: 6,
  Rows: 1,
  Text: "Menu",
  TextColor: "#AABBCC",
  BgColor: "#112233",
  BgMedia: null,
  BgMediaType: "picture" as const,
  BgMediaScaleType: "fit" as const,
  BgLoop: true,
  ActionType: "reply" as const,
  ActionBody: "menu",
  isJson: false,
  OpenURLType: "internal" as const,
  InternalBrowser: { Mode: "fullscreen-portrait" as const },
  TextVAlign: "middle" as const,
  TextHAlign: "center" as const,
  TextSize: "regular" as const,
  Silent: true,
  Frame: { BorderWidth: 3, BorderColor: "#FF00AA", CornerRadius: 4 },
};
const mixedDraft = normalizeKeyboardDraft(
  parseLlmKeyboardJson(
    JSON.stringify({
      humanReadableName: "From template",
      title: null,
      InputFieldState: "hidden",
      BgColor: null,
      Buttons: [
        {
          Columns: 3,
          Rows: 1,
          Text: "Menu",
          TextColor: "",
          BgColor: null,
          ActionType: "reply",
          ActionBody: "menu",
          OpenURLType: "internal",
        },
        {
          Columns: 3,
          Rows: 1,
          Text: "Contact",
          TextColor: "",
          BgColor: null,
          ActionType: "reply",
          ActionBody: "",
          OpenURLType: "internal",
        },
      ],
      summary: "ok",
    })
  ),
  theme,
  [templateButton]
);
assert.equal(mixedDraft.Buttons[0].TextColor, "#AABBCC"); // existing template style kept
assert.equal(mixedDraft.Buttons[0].BgColor, "#112233");
assert.deepEqual(mixedDraft.Buttons[0].Frame, templateButton.Frame);
assert.equal(mixedDraft.Buttons[1].TextColor, theme.TextColor); // new button → defaults
assert.equal(mixedDraft.Buttons[1].BgColor, theme.BgColor);
assert.deepEqual(mixedDraft.Buttons[1].Frame, theme.Frame);

const mediaDraft = normalizeKeyboardDraft(
  parseLlmKeyboardJson(
    JSON.stringify({
      humanReadableName: "Menu",
      title: null,
      InputFieldState: "hidden",
      BgColor: null,
      Buttons: [
        {
          Columns: 6,
          Rows: 2,
          Text: "Pizza",
          TextColor: "",
          BgColor: null,
          BgMedia: "https://cdn.example.com/pizza.jpg",
          BgMediaScaleType: "fill",
          ActionType: "none",
          ActionBody: "",
          OpenURLType: "internal",
        },
        {
          Columns: 6,
          Rows: 1,
          Text: "Broken",
          TextColor: "",
          BgColor: null,
          BgMedia: "not-a-url",
          ActionType: "reply",
          ActionBody: "x",
          OpenURLType: "internal",
        },
      ],
      summary: "ok",
    })
  ),
  theme
);
assert.equal(mediaDraft.Buttons[0].BgMedia, "https://cdn.example.com/pizza.jpg");
assert.equal(mediaDraft.Buttons[0].BgMediaType, "picture");
assert.equal(mediaDraft.Buttons[0].BgMediaScaleType, "fill");
assert.equal(mediaDraft.Buttons[0].BgLoop, true);
const mediaMissing = computeMissingFields(mediaDraft);
assert.ok(mediaMissing.some((m) => m.includes("Broken") && m.includes("BgMedia")));
assert.ok(!mediaMissing.some((m) => m.includes("Pizza") && m.includes("BgMedia")));

const existingMediaButton = {
  ...templateButton,
  Text: "Pizza",
  BgMedia: "https://cdn.example.com/kept.gif",
  BgMediaType: "gif" as const,
  BgMediaScaleType: "crop" as const,
  BgLoop: false,
};
const keptMediaDraft = normalizeKeyboardDraft(
  parseLlmKeyboardJson(
    JSON.stringify({
      humanReadableName: "Menu",
      title: null,
      InputFieldState: "hidden",
      BgColor: null,
      Buttons: [
        {
          Columns: 6,
          Rows: 1,
          Text: "Pizza",
          TextColor: "",
          BgColor: null,
          ActionType: "reply",
          ActionBody: "menu",
          OpenURLType: "internal",
        },
      ],
      summary: "ok",
    })
  ),
  theme,
  [existingMediaButton]
);
assert.equal(keptMediaDraft.Buttons[0].BgMedia, "https://cdn.example.com/kept.gif");
assert.equal(keptMediaDraft.Buttons[0].BgMediaType, "gif");
assert.equal(keptMediaDraft.Buttons[0].BgMediaScaleType, "crop");
assert.equal(keptMediaDraft.Buttons[0].BgLoop, false);

const catalog = [{ name: "Welcome", triggers: ["welcome", "start"] }];

assert.equal(resolveTriggerValue("Welcome", catalog), "welcome");
assert.equal(resolveTriggerValue("START", catalog), "start");
assert.equal(resolveTriggerValue("order_now", catalog), "order_now");
assert.equal(
  resolveReplyActionBody(JSON.stringify({ trigger: "Welcome", click: "now" }), true, catalog),
  JSON.stringify({ trigger: "welcome", click: "now" })
);

const named = normalizeKeyboardDraft(
  parseLlmKeyboardJson(
    JSON.stringify({
      humanReadableName: "Pad",
      title: null,
      InputFieldState: "hidden",
      BgColor: null,
      Buttons: [
        {
          Columns: 6,
          Rows: 1,
          Text: "Start",
          TextColor: "#FFFFFF",
          BgColor: null,
          ActionType: "reply",
          ActionBody: "Welcome",
          isJson: false,
          OpenURLType: "internal",
        },
      ],
      summary: "ok",
    })
  ),
  theme,
  undefined,
  catalog
);
assert.equal(named.Buttons[0].ActionBody, "welcome");
assert.equal(named.Buttons[0].isJson, false);

const kbPrompt = buildKeyboardUserPrompt({
  description: "make Start trigger Welcome",
  availableSteps: catalog,
});
assert.match(kbPrompt, /Available bot steps/);
assert.match(kbPrompt, /"name":"Welcome"/);

const carPrompt = buildCarouselUserPrompt({
  description: "Order button triggers Welcome",
  availableSteps: catalog,
});
assert.match(carPrompt, /Available bot steps/);

console.log("Part A (normalizer): all assertions passed");

// --- Part B: live LLM call (requires provider env), only with --live ---
// Wrapped in an async function: tsconfig is CommonJS, so top-level await fails tsc.
async function runLive(): Promise<void> {
  const rootEnv = resolveRootEnvPath();
  dotenv.config(rootEnv ? { path: rootEnv } : {});
  const { createAIProvider } = await import(
    "../adapters/out/langchain/factory/AIProviderFactory"
  );
  const { BuildKeyboardUseCaseImpl } = await import(
    "../application/use-cases/BuildKeyboardUseCase"
  );
  const logger = new ConsoleLogger("KeyboardBuilderTest");
  const useCase = new BuildKeyboardUseCaseImpl(createAIProvider(logger), logger);

  const firstDescription =
    "Main menu with buttons for Prices, Locations and a button opening https://example.com";
  const result = await useCase.generate({ description: firstDescription });
  console.log(JSON.stringify(result, null, 2));
  assert.ok(result.draft.Buttons.length >= 3);

  // Turn 2: refinement via client-held history — must modify, not regenerate
  const refined = await useCase.generate({
    description: "Make all buttons full width (6 columns)",
    history: [
      { role: "user", content: firstDescription },
      { role: "assistant", content: result.assistantMessage },
    ],
  });
  console.log(JSON.stringify(refined.draft.Buttons, null, 2));
  assert.ok(refined.draft.Buttons.every((b) => b.Columns === 6));
  assert.equal(refined.draft.Buttons.length, result.draft.Buttons.length); // buttons preserved
  console.log("Part B (live LLM, 2 turns): passed");
}

if (process.argv.includes("--live")) {
  runLive().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
