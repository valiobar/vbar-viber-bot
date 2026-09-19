/**
 * Port interface for AI keyboard generation.
 * Inbound port (use case) defining the AI↔admin contract.
 * Contract types live in @vbar/shared (packages/shared/src/types/ai.ts).
 */

import type { GenerateKeyboardInput, GenerateKeyboardResult } from "@vbar/shared";

// Re-export for existing internal consumers (prompt, normalizer, use case, test script).
export type {
  AiChatTurn,
  GenerateKeyboardInput,
  GenerateKeyboardResult,
  KeyboardButtonDefaults,
  KeyboardDraft,
  KeyboardDraftButton,
} from "@vbar/shared";

export interface BuildKeyboardUseCase {
  generate(input: GenerateKeyboardInput): Promise<GenerateKeyboardResult>;
}
