"use client";

/**
 * Bot Settings Page
 *
 * Displays a form for editing bot settings.
 * Fetches initial bot settings and uses BotSettingsForm component.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BotSettingsForm from "@/components/bot/settings/BotSettingsForm";
import type { BotSettingsDTO } from "@/domains/bot-settings/application/dto/BotSettingsDTO";
import type { UpdateBotSettingsInput } from "@/domains/bot-settings/ports/in/UpdateBotSettingsUseCase";
import type { ApiResponse } from "@vbar/shared";

export default function SettingsPage() {
  const router = useRouter();
  const [botSettings, setBotSettings] = useState<BotSettingsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Fetch bot settings on mount
   */
  useEffect(() => {
    async function fetchBotSettings() {
      try {
        setIsLoading(true);
        setError(null);
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const url = `${baseUrl}/api/bot-settings`;

        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError("Bot settings not found. Creating new settings...");
            // Initialize with empty settings for new installation
            setBotSettings(null);
            return;
          } else {
            setError("Failed to load bot settings");
            return;
          }
        }

        const data: ApiResponse<BotSettingsDTO> = await response.json();
        if (data.data) {
          setBotSettings(data.data);
        } else if (data.error) {
          setError(data.error.message);
        }
      } catch (err) {
        console.error("Error fetching bot settings:", err);
        setError("Failed to load bot settings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBotSettings();
  }, []);

  /**
   * Handle form submission for updating bot settings
   */
  const handleSubmit = async (input: UpdateBotSettingsInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/bot-settings`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData: ApiResponse<BotSettingsDTO> = await response.json();
        const errorMessage =
          errorData.error?.message || "Failed to update bot settings";
        setError(errorMessage);
        return;
      }

      const data: ApiResponse<BotSettingsDTO> = await response.json();
      if (data.data) {
        setBotSettings(data.data);
        setSuccessMessage("Bot settings updated successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
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

  // Show loading state
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

  // Render form with bot settings data
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
}



