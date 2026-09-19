/**
 * Port interface for AI carousel generation.
 * Inbound port (use case) defining the AI↔admin contract.
 * Contract types live in @vbar/shared (packages/shared/src/types/ai.ts).
 */

import type { GenerateCarouselInput, GenerateCarouselResult } from "@vbar/shared";

// Re-export for internal consumers (prompt, normalizer, use case, test script).
export type {
  AiChatTurn,
  CarouselCtaDefaults,
  CarouselDraft,
  CarouselDraftCard,
  GenerateCarouselInput,
  GenerateCarouselResult,
  KeyboardButtonDefaults,
  KeyboardDraftButton,
} from "@vbar/shared";

export interface BuildCarouselUseCase {
  generate(input: GenerateCarouselInput): Promise<GenerateCarouselResult>;
}
