import { z } from "zod";

/**
 * Reduced LLM output shapes for the keyboard and carousel builders.
 * Deliberately permissive (plain numbers/strings, catch-all enums via string):
 * shape is enforced natively by the provider, business rules by the normalizers
 * in this folder. The prompts in application/prompts document these shapes to
 * the model; the use cases pass the schemas to generateStructured.
 */

const llmButtonFrameSchema = z
  .object({
    BorderWidth: z.number(), // normalizer clamps 0-10
    BorderColor: z.string(),
    CornerRadius: z.number(), // normalizer clamps 0-10
  })
  .nullable()
  .optional(); // omit / null → buttonDefaults.Frame

// --- Keyboard builder ---

export const llmKeyboardOutputSchema = z.object({
  humanReadableName: z.string(), // "" if not stated by the user
  title: z.string().nullable(),
  InputFieldState: z.string(), // normalizer validates the enum
  BgColor: z.string().nullable(),
  Buttons: z.array(
    z.object({
      Columns: z.number(), // normalizer clamps 1-6
      Rows: z.number(), // normalizer clamps 1-2
      Text: z.string(),
      TextColor: z.string(), // normalizer validates hex
      BgColor: z.string().nullable(),
      BgMedia: z.string().nullable().optional(), // http(s) URL or null; never invent
      BgMediaType: z.string().optional(), // picture | gif
      BgMediaScaleType: z.string().optional(), // fit | crop | fill
      BgLoop: z.boolean().optional(),
      ActionType: z.string(), // normalizer validates the enum
      // string for plain reply/URL; object allowed so a JSON payload is not rejected
      ActionBody: z.union([z.string(), z.record(z.unknown())]),
      isJson: z.boolean().optional(), // true → ActionBody is { trigger, ...props }
      OpenURLType: z.string(),
      Frame: llmButtonFrameSchema,
    })
  ),
  summary: z.string(), // 1-2 sentences; system prompt requires the description's language
});

/** Reduced shape we ask the LLM for; normalizer expands it to KeyboardDraftButton. */
export type LlmKeyboardOutput = z.infer<typeof llmKeyboardOutputSchema>;

// --- Carousel builder ---

const llmCustomButtonSchema = z.object({
  Columns: z.number(), // normalizer clamps 1-ButtonsGroupColumns
  Rows: z.number(), // normalizer clamps 1-ButtonsGroupRows
  Text: z.string(),
  TextColor: z.string(), // "" → buttonDefaults
  BgColor: z.string().nullable(),
  BgMedia: z.string().nullable().optional(), // http(s) URL or null; never invent
  BgMediaType: z.string().optional(), // picture | gif
  BgMediaScaleType: z.string().optional(), // fit | crop | fill
  BgLoop: z.boolean().optional(),
  ActionType: z.string(), // reply | open-url | none (not location-picker / share-phone)
  ActionBody: z.union([z.string(), z.record(z.unknown())]),
  isJson: z.boolean().optional(),
  OpenURLType: z.string(),
  Frame: llmButtonFrameSchema,
});

/** Permissive reduced shape — business rules enforced by the normalizer. */
export const llmCarouselOutputSchema = z.object({
  humanReadableName: z.string(), // "" if not stated by the user
  BgColor: z.string().nullable(),
  ButtonsGroupColumns: z.number(), // normalizer clamps 1-6
  ButtonsGroupRows: z.number(), // normalizer clamps 1-7
  Cards: z.array(
    z.object({
      mode: z.string().optional(), // "custom" (default) | "structured"
      image: z.string().nullable(), // structured only; null unless the user gave a URL
      title: z.string(),
      titleColor: z.string(), // "" → normalizer default #323232
      description: z.string(),
      descriptionColor: z.string(), // "" → normalizer default #777777
      textRows: z.number(), // structured; normalizer clamps 1-3
      ctaButtons: z
        .array(
          z.object({
            text: z.string(),
            textColor: z.string(), // "" → ctaDefaults
            bgColor: z.string().nullable(),
            actionType: z.string(), // reply|open-url|none
            actionBody: z.string(),
            openURLType: z.string(),
            Frame: llmButtonFrameSchema,
          })
        )
        .optional(),
      Buttons: z.array(llmCustomButtonSchema).optional(),
    })
  ),
  summary: z.string(),
});

export type LlmCarouselOutput = z.infer<typeof llmCarouselOutputSchema>;
