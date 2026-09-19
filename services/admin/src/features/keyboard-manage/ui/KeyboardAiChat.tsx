"use client";

import { useState } from "react";
import type { KeyboardDTO } from "@/entities/keyboard";
import { AiChatDrawer, MissingFieldsNotice, useAiChat } from "@/shared";
import type {
  GenerateKeyboardResult,
  KeyboardButtonDefaults,
  KeyboardDraft,
  KeyboardDraftButton,
} from "@vbar/shared";
import { generateKeyboardDraft } from "../api/generateKeyboardDraft";

interface KeyboardAiChatProps {
  isOpen: boolean;
  /** Any visible keyboard — used as a starting layout, not only isTemplate rows. */
  sourceKeyboards: KeyboardDTO[];
  buttonDefaults: KeyboardButtonDefaults;
  /** Live form state — sent as the authoritative base so manual edits survive refinements. */
  currentDraft: KeyboardDraft;
  /** Hydrate the form from a picked keyboard or a generated draft. Drawer stays open. */
  onApply: (draft: KeyboardDraft, missingFields?: string[]) => void;
  onClose: () => void;
}

type Phase = "source" | "template" | "describe" | "result";

const QUICK_REPLY_CLASS =
  "rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";

const PRIMARY_BUTTON_CLASS =
  "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800";

const TEXTAREA_CLASS =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-300";

const AI_NAME_SUFFIX = " (AI)";
const NAME_MAX_LENGTH = 100;

const stripButtonMeta = (buttons: KeyboardDTO["Buttons"]): KeyboardDraftButton[] =>
  buttons.map(({ id: _id, createdAt: _c, updatedAt: _u, ...fields }) => fields);

const withAiNameSuffix = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.endsWith(AI_NAME_SUFFIX)) return trimmed.slice(0, NAME_MAX_LENGTH);
  const budget = NAME_MAX_LENGTH - AI_NAME_SUFFIX.length;
  return `${trimmed.slice(0, budget)}${AI_NAME_SUFFIX}`;
};

export const KeyboardAiChat = ({
  isOpen,
  sourceKeyboards,
  buttonDefaults,
  currentDraft,
  onApply,
  onClose,
}: KeyboardAiChatProps) => {
  const [phase, setPhase] = useState<Phase>("source");
  const [description, setDescription] = useState("");
  const [refineText, setRefineText] = useState("");
  const [result, setResult] = useState<{ draft: KeyboardDraft; missingFields: string[] } | null>(
    null
  );

  // The live form (buttons or a typed name) is the authoritative base:
  // sending it lets manual edits survive the next refinement.
  const formHasContent =
    currentDraft.Buttons.length > 0 || currentDraft.humanReadableName.trim().length > 0;

  const { messages, say, isGenerating, runGenerate } = useAiChat<GenerateKeyboardResult>({
    intro: "Describe the keyboard you want me to build. Do you want to start from scratch or from an existing keyboard?",
    generate: (text, history) =>
      generateKeyboardDraft({
        description: text,
        history: history.length > 0 ? history : undefined,
        currentDraft: formHasContent ? currentDraft : undefined,
        buttonDefaults,
      }),
    getAssistantTurn: (res) => res.assistantMessage,
    getBotReply: (res) => res.summary,
  });

  const handleChooseScratch = () => {
    say({ role: "user", text: "From scratch" });
    say({ role: "bot", text: "Great — describe the keyboard (buttons, layout, colors, actions)." });
    setPhase("describe");
  };

  const handleStartFromExisting = () => {
    say({ role: "user", text: "Start from an existing keyboard" });
    say({
      role: "bot",
      text: "Pick a keyboard — I will use its buttons as the base, then you can describe changes.",
    });
    setPhase("template");
  };

  const handlePickSourceKeyboard = (kb: KeyboardDTO) => {
    const buttons = stripButtonMeta(kb.Buttons);
    say({ role: "user", text: `Start from: ${kb.humanReadableName}` });
    onApply({
      humanReadableName: withAiNameSuffix(kb.humanReadableName),
      title: kb.title,
      InputFieldState: kb.InputFieldState,
      BgColor: kb.BgColor,
      Buttons: buttons,
    });
    say({
      role: "bot",
      text: "I applied this keyboard to the form. Describe what should change — you can refine again after the first draft.",
    });
    setPhase("describe");
  };

  const handleTurn = async (text: string) => {
    const res = await runGenerate(text);
    if (!res) return;
    setResult({ draft: res.draft, missingFields: res.missingFields });
    onApply(res.draft, res.missingFields);
    setRefineText("");
    setPhase("result");
  };

  const handleGenerate = () => {
    if (description.trim()) void handleTurn(description.trim());
  };

  const handleRefine = () => {
    if (refineText.trim()) void handleTurn(refineText.trim());
  };

  return (
    <AiChatDrawer
      isOpen={isOpen}
      title="Create keyboard with AI"
      messages={messages}
      isGenerating={isGenerating}
      onClose={onClose}
    >
      {phase === "source" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleChooseScratch}
            aria-label="Start from scratch"
            className={QUICK_REPLY_CLASS}
          >
            From scratch
          </button>
          {sourceKeyboards.length > 0 && (
            <button
              type="button"
              onClick={handleStartFromExisting}
              aria-label="Start from an existing keyboard"
              className={QUICK_REPLY_CLASS}
            >
              Start from an existing keyboard
            </button>
          )}
        </div>
      )}

      {phase === "template" && (
        <div className="max-h-48 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {sourceKeyboards.map((kb) => (
              <button
                key={kb.id}
                type="button"
                onClick={() => handlePickSourceKeyboard(kb)}
                aria-label={`Start from keyboard ${kb.humanReadableName}`}
                className={QUICK_REPLY_CLASS}
              >
                {kb.humanReadableName}
                {kb.isTemplate ? " (template)" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "describe" && (
        <div className="space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={isGenerating}
            placeholder="e.g. Main menu with Prices that triggers the Prices step, and a button opening https://example.com"
            aria-label="Keyboard description"
            className={TEXTAREA_CLASS}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            data-testid="ai-chat-generate"
            aria-label="Generate keyboard draft"
            className={PRIMARY_BUTTON_CLASS}
          >
            Generate
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="space-y-3">
          <MissingFieldsNotice
            variant="chat"
            testId="ai-missing-fields"
            title="Missing required fields — fill these in the form:"
            fields={result.missingFields}
          />
          <textarea
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            rows={2}
            disabled={isGenerating}
            placeholder='Ask for changes, e.g. "make the Start button trigger the Welcome step"'
            aria-label="Refine keyboard draft"
            className={TEXTAREA_CLASS}
          />
          <button
            type="button"
            onClick={handleRefine}
            disabled={!refineText.trim() || isGenerating}
            data-testid="ai-chat-refine"
            aria-label="Refine keyboard draft"
            className={PRIMARY_BUTTON_CLASS}
          >
            Refine
          </button>
        </div>
      )}
    </AiChatDrawer>
  );
};
