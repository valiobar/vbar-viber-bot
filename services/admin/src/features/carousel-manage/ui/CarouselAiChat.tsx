"use client";

import { useState } from "react";
import type { CarouselCardDTO, CarouselDTO } from "@/entities/carousel";
import { AiChatDrawer, MissingFieldsNotice, useAiChat } from "@/shared";
import type {
  CarouselCtaDefaults,
  CarouselDraft,
  CarouselDraftCard,
  GenerateCarouselResult,
  KeyboardButtonDefaults,
} from "@vbar/shared";
import { generateCarouselDraft } from "../api/generateCarouselDraft";

type AiChatMode = "create" | "edit";

interface CarouselAiChatProps {
  isOpen: boolean;
  /** Any visible carousel — used as a starting point, not only isTemplate rows. */
  sourceCarousels?: CarouselDTO[];
  ctaDefaults: CarouselCtaDefaults;
  buttonDefaults: KeyboardButtonDefaults;
  /** Live form state — sent as the authoritative base so manual edits survive refinements. */
  currentDraft: CarouselDraft;
  /** Hydrate the form from a picked carousel or a generated draft. Drawer stays open. */
  onApply: (draft: CarouselDraft, missingFields?: string[]) => void;
  onClose: () => void;
  /** Edit starts at refine against the loaded carousel; create starts from scratch / existing. */
  mode?: AiChatMode;
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

/** CarouselDTO cards → draft cards (strip button meta from custom-card Buttons). */
const toDraftCards = (cards: CarouselCardDTO[]): CarouselDraftCard[] =>
  cards.map((card) => ({
    ...card,
    Buttons: card.Buttons.map(({ id: _id, createdAt: _c, updatedAt: _u, ...fields }) => fields),
  }));

const withAiNameSuffix = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.endsWith(AI_NAME_SUFFIX)) return trimmed.slice(0, NAME_MAX_LENGTH);
  const budget = NAME_MAX_LENGTH - AI_NAME_SUFFIX.length;
  return `${trimmed.slice(0, budget)}${AI_NAME_SUFFIX}`;
};

export const CarouselAiChat = ({
  isOpen,
  sourceCarousels = [],
  ctaDefaults,
  buttonDefaults,
  currentDraft,
  onApply,
  onClose,
  mode = "create",
}: CarouselAiChatProps) => {
  const [phase, setPhase] = useState<Phase>(mode === "edit" ? "result" : "source");
  const [description, setDescription] = useState("");
  const [refineText, setRefineText] = useState("");
  const [result, setResult] = useState<{
    draft: CarouselDraft;
    missingFields: string[];
  } | null>(null);

  const formHasContent =
    currentDraft.Cards.length > 0 || currentDraft.humanReadableName.trim().length > 0;

  const { messages, say, isGenerating, runGenerate } = useAiChat<GenerateCarouselResult>({
    intro:
      mode === "edit"
        ? "Describe what to change — I'll refine the current carousel."
        : "Describe the carousel you want me to build. Do you want to start from scratch or from an existing carousel?",
    generate: (text, history) =>
      generateCarouselDraft({
        description: text,
        history: history.length > 0 ? history : undefined,
        currentDraft: formHasContent ? currentDraft : undefined,
        ctaDefaults,
        buttonDefaults,
      }),
    getAssistantTurn: (res) => res.assistantMessage,
    getBotReply: (res) => res.summary,
  });

  const handleChooseScratch = () => {
    say({ role: "user", text: "From scratch" });
    say({
      role: "bot",
      text: "Great — describe the carousel (cards, images, titles, buttons).",
    });
    setPhase("describe");
  };

  const handleStartFromExisting = () => {
    say({ role: "user", text: "Start from an existing carousel" });
    say({
      role: "bot",
      text: "Pick a carousel — I will use its cards as the base, then you can describe changes.",
    });
    setPhase("template");
  };

  const handlePickSourceCarousel = (carousel: CarouselDTO) => {
    say({ role: "user", text: `Start from: ${carousel.humanReadableName}` });
    onApply({
      humanReadableName: withAiNameSuffix(carousel.humanReadableName),
      BgColor: carousel.BgColor,
      ButtonsGroupColumns: carousel.ButtonsGroupColumns,
      ButtonsGroupRows: carousel.ButtonsGroupRows,
      Cards: toDraftCards(carousel.Cards),
    });
    say({
      role: "bot",
      text: "I applied this carousel to the form. Describe what should change — you can refine again after the first draft.",
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
      title={mode === "edit" ? "Edit carousel with AI" : "Create carousel with AI"}
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
          {sourceCarousels.length > 0 && (
            <button
              type="button"
              onClick={handleStartFromExisting}
              aria-label="Start from an existing carousel"
              className={QUICK_REPLY_CLASS}
            >
              Start from an existing carousel
            </button>
          )}
        </div>
      )}

      {phase === "template" && (
        <div className="max-h-48 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {sourceCarousels.map((carousel) => (
              <button
                key={carousel.id}
                type="button"
                onClick={() => handlePickSourceCarousel(carousel)}
                aria-label={`Start from carousel ${carousel.humanReadableName}`}
                className={QUICK_REPLY_CLASS}
              >
                {carousel.humanReadableName}
                {carousel.isTemplate ? " (template)" : ""}
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
            placeholder="e.g. Carousel with 3 product cards, each with an Order button that triggers the Order step"
            aria-label="Carousel description"
            className={TEXTAREA_CLASS}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            data-testid="ai-chat-generate"
            aria-label="Generate carousel draft"
            className={PRIMARY_BUTTON_CLASS}
          >
            Generate
          </button>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-3">
          {result && (
            <MissingFieldsNotice
              variant="chat"
              testId="ai-missing-fields"
              title="Missing required fields — fill these in the form:"
              fields={result.missingFields}
            />
          )}
          <textarea
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            rows={2}
            disabled={isGenerating}
            placeholder='Ask for changes, e.g. "make the Order button trigger the Welcome step"'
            aria-label="Refine carousel draft"
            className={TEXTAREA_CLASS}
          />
          <button
            type="button"
            onClick={handleRefine}
            disabled={!refineText.trim() || isGenerating}
            data-testid="ai-chat-refine"
            aria-label="Refine carousel draft"
            className={PRIMARY_BUTTON_CLASS}
          >
            Refine
          </button>
        </div>
      )}
    </AiChatDrawer>
  );
};
