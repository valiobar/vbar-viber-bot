import { create } from "zustand";
import { HttpError } from "@/shared";
import { getBotSettings } from "../api/botSettings";
import type { BotSettingsDTO } from "./types";

interface BotSettingsState {
  settings: BotSettingsDTO | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  setSettings: (settings: BotSettingsDTO | null) => void;
}

let loadPromise: Promise<void> | null = null;

export const useBotSettingsStore = create<BotSettingsState>((set, get) => ({
  settings: null,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) {
      return;
    }
    if (loadPromise !== null) {
      return loadPromise;
    }

    loadPromise = (async () => {
      try {
        const settings = await getBotSettings();
        set({ settings, isLoaded: true });
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          set({ settings: null, isLoaded: true });
          return;
        }
        console.error("Failed to load bot settings for button defaults", error);
        set({ isLoaded: true });
      } finally {
        loadPromise = null;
      }
    })();

    return loadPromise;
  },

  setSettings: (settings) => {
    set({ settings, isLoaded: true });
  },
}));
