import { Logger } from "@vbar/shared";
import { AIProviderPort } from "../../ports/out/AIProviderPort";
import { ConversationContext } from "../../domains/ai/entities";
import {
  BuildCarouselUseCase,
  GenerateCarouselInput,
  GenerateCarouselResult,
  AiChatTurn,
} from "../../ports/in/BuildCarouselUseCase";
import {
  CAROUSEL_BUILDER_SYSTEM_PROMPT,
  buildCarouselUserPrompt,
  serializeCarouselDraftForHistory,
} from "../prompts/carouselBuilderPrompt";
import { llmCarouselOutputSchema } from "../../domains/builder/services/llmOutputSchemas";
import {
  normalizeCarouselDraft,
  computeMissingFields,
} from "../../domains/builder/services/carouselDraftNormalizer";

const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_HISTORY_TURNS = 20; // hard cap; LangChainAdapter also clamps to CONVERSATION_MAX_HISTORY

/** Client-held history → in-memory ConversationContext (nothing touches Mongo). */
function historyToContext(history?: AiChatTurn[]): ConversationContext | undefined {
  if (!history || history.length === 0) {
    return undefined;
  }
  const valid = history
    .filter(
      (t) =>
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string" &&
        t.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS);
  if (valid.length === 0) {
    return undefined;
  }
  return new ConversationContext(
    "carousel-builder", // synthetic id — required by the entity, never persisted
    valid.map((t) => ({ role: t.role, content: t.content, timestamp: new Date() }))
  );
}

export class BuildCarouselUseCaseImpl implements BuildCarouselUseCase {
  constructor(
    private readonly aiProvider: AIProviderPort,
    private readonly logger: Logger
  ) {}

  async generate(input: GenerateCarouselInput): Promise<GenerateCarouselResult> {
    const description = input.description?.trim();
    if (!description) {
      throw new Error("description is required");
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    }

    const context = historyToContext(input.history);
    // currentDraft (live form state, possibly manually edited) is the
    // authoritative base when present.
    const userPrompt = buildCarouselUserPrompt({
      description,
      currentDraft: input.currentDraft,
      ctaDefaults: input.ctaDefaults,
      buttonDefaults: input.buttonDefaults,
      availableSteps: input.availableSteps,
    });

    const parsed = await this.aiProvider.generateStructured(
      userPrompt,
      llmCarouselOutputSchema,
      context,
      CAROUSEL_BUILDER_SYSTEM_PROMPT
    );

    const draft = normalizeCarouselDraft(
      parsed,
      input.ctaDefaults,
      input.currentDraft?.Cards,
      input.buttonDefaults,
      input.availableSteps
    );
    const missingFields = computeMissingFields(draft);
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : `Draft carousel with ${draft.Cards.length} card(s) generated.`;

    this.logger.info("Carousel draft generated", {
      cards: draft.Cards.length,
      missingFields: missingFields.length,
      historyTurns: input.history?.length ?? 0,
    });

    return {
      draft,
      missingFields,
      summary,
      assistantMessage: serializeCarouselDraftForHistory(draft, summary),
    };
  }
}
