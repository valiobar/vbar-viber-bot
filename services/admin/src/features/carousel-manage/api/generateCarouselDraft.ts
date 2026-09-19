import type { GenerateCarouselInput, GenerateCarouselResult } from "@vbar/shared";
import { http } from "@/shared";

export const generateCarouselDraft = (
  input: GenerateCarouselInput
): Promise<GenerateCarouselResult> =>
  http<GenerateCarouselResult>("/api/ai/carousel-builder", {
    method: "POST",
    body: input,
  });
