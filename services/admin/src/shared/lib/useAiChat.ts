"use client";

import { useState } from "react";
import type { AiChatTurn } from "@vbar/shared";
import type { AiChatMessage } from "../ui/AiChatDrawer";

interface UseAiChatOptions<TResult> {
  /** First bot bubble shown when the chat opens. */
  intro: string;
  /** Feature-owned generate call — receives the user text and the current history. */
  generate: (text: string, history: AiChatTurn[]) => Promise<TResult>;
  /** Extracts the assistant turn (e.g. compact draft JSON) appended to history. */
  getAssistantTurn: (result: TResult) => string;
  /** Extracts the bot bubble text shown for a successful result. */
  getBotReply: (result: TResult) => string;
}

export const useAiChat = <TResult,>({
  intro,
  generate,
  getAssistantTurn,
  getBotReply,
}: UseAiChatOptions<TResult>) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([{ role: "bot", text: intro }]);
  const [history, setHistory] = useState<AiChatTurn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const say = (message: AiChatMessage) => setMessages((prev) => [...prev, message]);

  /** Shared by the first generate and every refine turn. Returns null on failure
   *  (error bubble already shown) so the caller keeps its phase and input text. */
  const runGenerate = async (text: string): Promise<TResult | null> => {
    say({ role: "user", text });
    setIsGenerating(true);
    try {
      const result = await generate(text, history);
      setHistory((prev) => [
        ...prev.filter((turn) => turn.role === "user"),
        { role: "user", content: text },
        { role: "assistant", content: getAssistantTurn(result) },
      ]);
      say({ role: "bot", text: getBotReply(result) });
      return result;
    } catch (err) {
      say({
        role: "bot",
        text: err instanceof Error ? `Generation failed: ${err.message}` : "Generation failed, try again.",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { messages, say, isGenerating, history, runGenerate };
};
