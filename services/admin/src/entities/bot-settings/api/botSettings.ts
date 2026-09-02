import { http } from "@/shared";
import type { BotSettingsDTO, UpdateBotSettingsInput } from "../model/types";

export const getBotSettings = (): Promise<BotSettingsDTO> =>
  http<BotSettingsDTO>("/api/bot-settings");

export const updateBotSettings = (
  input: UpdateBotSettingsInput
): Promise<BotSettingsDTO> =>
  http<BotSettingsDTO>("/api/bot-settings", { method: "PUT", body: input });
