/**
 * AI service ↔ admin contract for AI builder features (keyboard builder now,
 * carousel builder later). Single source of truth: services/ai implements it,
 * services/admin consumes it — no per-service mirrors.
 */

import type { ButtonDTO, ButtonFrame, InputFieldState } from "./admin";

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
