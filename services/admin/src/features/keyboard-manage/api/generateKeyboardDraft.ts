import type { GenerateKeyboardInput, GenerateKeyboardResult } from "@vbar/shared";
import { http } from "@/shared";

export const generateKeyboardDraft = (
  input: GenerateKeyboardInput
): Promise<GenerateKeyboardResult> =>
  http<GenerateKeyboardResult>("/api/ai/keyboard-builder", {
    method: "POST",
    body: input,
  });
