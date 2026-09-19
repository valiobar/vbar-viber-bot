import { Logger } from "@vbar/shared";
import { AIProviderPort } from "../../ports/out/AIProviderPort";
import { ConversationContext } from "../../domains/ai/entities";
import {
  BuildKeyboardUseCase,
  GenerateKeyboardInput,
  GenerateKeyboardResult,
  AiChatTurn,
} from "../../ports/in/BuildKeyboardUseCase";
import {
  KEYBOARD_BUILDER_SYSTEM_PROMPT,
  buildKeyboardUserPrompt,
  serializeDraftForHistory,
  llmKeyboardOutputSchema,
} from "./keyboardBuilderPrompt";
import {
  normalizeKeyboardDraft,
  computeMissingFields,
} from "./keyboardDraftNormalizer";

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
    "keyboard-builder", // synthetic id — required by the entity, never persisted
    valid.map((t) => ({ role: t.role, content: t.content, timestamp: new Date() }))
  );
}

export class BuildKeyboardUseCaseImpl implements BuildKeyboardUseCase {
  constructor(
    private readonly aiProvider: AIProviderPort,
    private readonly logger: Logger
  ) {}

  async generate(input: GenerateKeyboardInput): Promise<GenerateKeyboardResult> {
    const description = input.description?.trim();
    if (!description) {
      throw new Error("description is required");
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    }

    const context = historyToContext(input.history);
    // currentDraft (live form state, possibly manually edited) is the
    // authoritative base when present; otherwise template buttons seed the
    // first turn only — on refinement turns the previous draft is in history.
    const userPrompt = buildKeyboardUserPrompt({
      description,
      currentDraft: input.currentDraft,
      templateButtons: context ? undefined : input.templateButtons,
      buttonDefaults: input.buttonDefaults,
      availableSteps: input.availableSteps,
    });

    // Native structured output with prompt-based fallback — handled inside
    // generateStructured (Step 4); result is already zod-validated.
    const parsed = await this.aiProvider.generateStructured(
      userPrompt,
      llmKeyboardOutputSchema,
      context,
      KEYBOARD_BUILDER_SYSTEM_PROMPT
    );

    const existingButtons = input.currentDraft?.Buttons ?? input.templateButtons;
    const draft = normalizeKeyboardDraft(
      parsed,
      input.buttonDefaults,
      existingButtons,
      input.availableSteps
    );
    const missingFields = computeMissingFields(draft);
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : `Draft keyboard with ${draft.Buttons.length} button(s) generated.`;

    this.logger.info("Keyboard draft generated", {
      buttons: draft.Buttons.length,
      missingFields: missingFields.length,
      historyTurns: input.history?.length ?? 0,
    });

    return {
      draft,
      missingFields,
      summary,
      assistantMessage: serializeDraftForHistory(draft, summary),
    };
  }
}
