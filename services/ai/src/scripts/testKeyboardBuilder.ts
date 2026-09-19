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
