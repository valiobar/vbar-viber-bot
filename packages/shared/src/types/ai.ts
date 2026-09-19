/**
 * AI service ↔ admin contract for AI builder features (keyboard and carousel).
 * Single source of truth: services/ai implements it, services/admin consumes
 * it — no per-service mirrors.
 */

import type { ButtonDTO, ButtonFrame, CarouselCardDTO, InputFieldState } from "./admin";

/** One prior conversation turn — client-held, never persisted server-side. */
export interface AiChatTurn {
  role: "user" | "assistant";
  /** user: description/refinement text; assistant: the previous `assistantMessage`. */
  content: string;
}

/** Button fields as accepted by admin CreateKeyboardInput (no id/timestamps). */
export type KeyboardDraftButton = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">;

/** Admin-resolved Bot Settings theme — same values getDefaultButton uses. */
export interface KeyboardButtonDefaults {
  TextColor: string;
  BgColor: string | null;
  Frame: ButtonFrame | null;
}

export interface KeyboardDraft {
  humanReadableName: string; // "" when the description did not name the keyboard
  title: string | null;
  InputFieldState: InputFieldState;
  BgColor: string | null;
  Buttons: KeyboardDraftButton[];
}

/** Compact step row for AI builders — name + triggers only, no ids or content. */
export interface AvailableStep {
  name: string;
  triggers: string[];
}

export interface GenerateKeyboardInput {
  description: string;
  /** Prior turns, client-held; the service builds an in-memory ConversationContext from them. */
  history?: AiChatTurn[];
  /** Optional starting layout copied from a template keyboard (first turn only). */
  templateButtons?: KeyboardDraftButton[];
  /** Visual defaults when the user did not specify colors/frame. Sent every turn. */
  buttonDefaults?: KeyboardButtonDefaults;
  /**
   * Live form state (may include manual user edits) — the authoritative base the
   * newest turn refines. Takes precedence over drafts in `history` and over
   * `templateButtons` when present.
   */
  currentDraft?: KeyboardDraft;
  /**
   * Live steps (admin-injected). When the user names or paraphrases a step,
   * ActionBody must use that step's first trigger (or a listed trigger they typed).
   */
  availableSteps?: AvailableStep[];
}

export interface GenerateKeyboardResult {
  draft: KeyboardDraft;
  /** Human-readable list of required fields the user still has to fill in. */
  missingFields: string[];
  /** Short human summary of what was generated (shown in the chat). */
  summary: string;
  /** Compact draft JSON — the client appends it as the assistant turn for refinements. */
  assistantMessage: string;
}

/**
 * Admin-resolved CTA theme from Bot Settings — same values CardEditor's
 * getDefaultCta uses (resolveCtaColors + resolveButtonFrame).
 */
export interface CarouselCtaDefaults {
  textColor: string; // settings.buttonsTextColor ?? "#FFFFFF"
  bgColor: string; // settings.buttonsBackground ?? "#7360F2"
  Frame: ButtonFrame | null; // settings.buttonsFrame
}

/**
 * Draft card — CarouselCardDTO with meta-free custom buttons.
 * New cards default to mode "custom" (free-grid Buttons). Structured cards
 * (image / title / description / ctaButtons) are used when the user asks for
 * that layout or when an existing currentDraft card is already structured.
 */
export type CarouselDraftCard = Omit<CarouselCardDTO, "Buttons"> & {
  Buttons: KeyboardDraftButton[];
};

/** Draft matching admin CarouselForm state (Cards flattened on save by admin). */
export interface CarouselDraft {
  humanReadableName: string; // "" when the description did not name the carousel
  BgColor: string | null; // #RRGGBB or #RRGGBBAA
  ButtonsGroupColumns: number; // 1-6, default 6
  ButtonsGroupRows: number; // 1-7, default 7
  Cards: CarouselDraftCard[];
}

export interface GenerateCarouselInput {
  description: string;
  /** Prior turns, client-held; the service builds an in-memory ConversationContext from them. */
  history?: AiChatTurn[];
  /** Live form state — authoritative base so manual edits survive refinements. */
  currentDraft?: CarouselDraft;
  /** Visual CTA defaults for structured cards. Sent every turn. */
  ctaDefaults?: CarouselCtaDefaults;
  /**
   * Visual defaults for custom-card Buttons — same values CardEditor's
   * getDefaultButton uses (resolveButtonColors + resolveButtonFrame).
   */
  buttonDefaults?: KeyboardButtonDefaults;
  availableSteps?: AvailableStep[];
}

export interface GenerateCarouselResult {
  draft: CarouselDraft;
  /** Human-readable list of required fields the user still has to fill in. */
  missingFields: string[];
  /** Short human summary of what was generated (shown in the chat). */
  summary: string;
  /** Compact draft JSON — the client appends it as the assistant turn for refinements. */
  assistantMessage: string;
}
