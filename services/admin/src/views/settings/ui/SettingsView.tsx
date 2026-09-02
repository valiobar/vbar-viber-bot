"use client";

/**
 * Settings view
 *
 * Route body for `/settings`. Fetches and saves bot settings via entity api.
 */

import { useState, useEffect } from "react";
import { BotSettingsForm } from "@/features/bot-settings-manage";
import { HttpError } from "@/shared";
import {
  getBotSettings,
  updateBotSettings,
  type BotSettingsDTO,
  type UpdateBotSettingsInput,
} from "@/entities/bot-settings";

export const SettingsView = () => {
  const [botSettings, setBotSettings] = useState<BotSettingsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchBotSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getBotSettings();
        setBotSettings(data);
      } catch (err) {
        console.error("Error fetching bot settings:", err);
        if (err instanceof HttpError && err.status === 404) {
          setError("Bot settings not found. Creating new settings...");
          setBotSettings(null);
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load bot settings"
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBotSettings();
  }, []);

  const handleSubmit = async (input: UpdateBotSettingsInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const data = await updateBotSettings(input);
      setBotSettings(data);
      setSuccessMessage("Bot settings updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error updating bot settings:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while updating bot settings"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bot Settings
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Loading bot settings...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Loading...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bot Settings
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Configure global bot settings including identity, appearance, and
          behavior
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-600 dark:text-green-300">
            {successMessage}
          </p>
        </div>
      )}

      <BotSettingsForm
        initialData={botSettings || undefined}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </main>
  );
};
