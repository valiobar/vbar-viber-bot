import type { BotSettingsDTO } from "../model/types";

export const FALLBACK_BUTTON_TEXT_COLOR = "#000000";
export const FALLBACK_CTA_TEXT_COLOR = "#FFFFFF";
export const FALLBACK_CTA_BG_COLOR = "#7360F2";

export const resolveButtonColors = (settings: BotSettingsDTO | null) => ({
  BgColor: settings?.buttonsBackground ?? null,
  TextColor: settings?.buttonsTextColor ?? FALLBACK_BUTTON_TEXT_COLOR,
});

export const resolveCtaColors = (settings: BotSettingsDTO | null) => ({
  bgColor: settings?.buttonsBackground ?? FALLBACK_CTA_BG_COLOR,
  textColor: settings?.buttonsTextColor ?? FALLBACK_CTA_TEXT_COLOR,
});
