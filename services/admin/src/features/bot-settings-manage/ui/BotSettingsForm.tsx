"use client";

/**
 * BotSettingsForm Component
 *
 * Form for editing bot settings with sections for general settings,
 * appearance, steps, and advanced options.
 */

import { useState, useEffect } from "react";
import type {
  BotSettingsDTO,
  BotStatus,
  UpdateBotSettingsInput,
} from "@/entities/bot-settings";
import { listSteps, type StepDTO } from "@/entities/step";

interface BotSettingsFormProps {
  /**
   * Initial bot settings data for editing
   */
  initialData?: BotSettingsDTO;

  /**
   * Callback when form is submitted
   */
  onSubmit: (data: UpdateBotSettingsInput) => Promise<void>;

  /**
   * Whether form is in loading state
   */
  isLoading?: boolean;
}

export const BotSettingsForm = ({
  initialData,
  onSubmit,
  isLoading = false,
}: BotSettingsFormProps) => {
  // Form state
  const [botName, setBotName] = useState("");
  const [botViberName, setBotViberName] = useState<string | null>(null);
  const [avatarURL, setAvatarURL] = useState<string | null>(null);
  const [status, setStatus] = useState<BotStatus>("active");
  const [buttonsBackground, setButtonsBackground] = useState<string | null>(
    null
  );
  const [buttonsTextColor, setButtonsTextColor] = useState<string | null>(null);
  const [buttonsPrefix, setButtonsPrefix] = useState<string | null>(null);
  const [welcomeStepId, setWelcomeStepId] = useState<string | null>(null);
  const [GAKey, setGAKey] = useState<string | null>(null);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<StepDTO[]>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);

  /**
   * Fetch steps for dropdown
   */
  useEffect(() => {
    const loadSteps = async () => {
      setIsLoadingSteps(true);
      try {
        const data = await listSteps({ hidden: false }, { limit: 1000 });
        setSteps(data.steps);
      } catch (err) {
        console.error("Error fetching steps:", err);
      } finally {
        setIsLoadingSteps(false);
      }
    };

    void loadSteps();
  }, []);

  /**
   * Initialize form with initial data
   */
  useEffect(() => {
    if (initialData) {
      setBotName(initialData.botName);
      setBotViberName(initialData.botViberName);
      setAvatarURL(initialData.avatarURL);
      setStatus(initialData.status);
      setButtonsBackground(initialData.buttonsBackground);
      setButtonsTextColor(initialData.buttonsTextColor);
      setButtonsPrefix(initialData.buttonsPrefix);
      setWelcomeStepId(initialData.welcomeStepId);
      setGAKey(initialData.GAKey);
    }
  }, [initialData]);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate botName (required)
    if (!botName.trim()) {
      newErrors.botName = "Bot name is required";
    } else if (botName.trim().length > 100) {
      newErrors.botName = "Bot name must be 100 characters or less";
    }

    // Validate avatarURL (if provided, must be valid URL)
    if (avatarURL && avatarURL.trim()) {
      try {
        new URL(avatarURL.trim());
      } catch {
        newErrors.avatarURL = "Invalid URL format";
      }
    }

    // Validate buttonsBackground (if provided, must be valid hex color)
    if (buttonsBackground && buttonsBackground.trim()) {
      if (!/^#[0-9A-F]{6}$/i.test(buttonsBackground.trim())) {
        newErrors.buttonsBackground =
          "Valid hex color is required (e.g., #FFFFFF)";
      }
    }

    // Validate buttonsTextColor (if provided, must be valid hex color)
    if (buttonsTextColor && buttonsTextColor.trim()) {
      if (!/^#[0-9A-F]{6}$/i.test(buttonsTextColor.trim())) {
        newErrors.buttonsTextColor =
          "Valid hex color is required (e.g., #000000)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Build form data
    const formData: UpdateBotSettingsInput = {
      botName: botName.trim(),
      botViberName: botViberName?.trim() || null,
      avatarURL: avatarURL?.trim() || null,
      status,
      buttonsBackground: buttonsBackground?.trim() || null,
      buttonsTextColor: buttonsTextColor?.trim() || null,
      buttonsPrefix: buttonsPrefix?.trim() || null,
      welcomeStepId: welcomeStepId || null,
      GAKey: GAKey?.trim() || null,
    };

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Settings Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          General Settings
        </h2>

        <div className="space-y-4">
          {/* Bot Name */}
          <div>
            <label
              htmlFor="botName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bot Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="botName"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.botName
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Enter bot name"
              maxLength={100}
            />
            {errors.botName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.botName}
              </p>
            )}
          </div>

          {/* Bot Viber Name */}
          <div>
            <label
              htmlFor="botViberName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bot Viber Name (Optional)
            </label>
            <input
              type="text"
              id="botViberName"
              value={botViberName || ""}
              onChange={(e) => setBotViberName(e.target.value.trim() || null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Enter bot Viber name"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label
              htmlFor="avatarURL"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Avatar URL (Optional)
            </label>
            <input
              type="url"
              id="avatarURL"
              value={avatarURL || ""}
              onChange={(e) => setAvatarURL(e.target.value.trim() || null)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.avatarURL
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="https://example.com/avatar.png"
            />
            {errors.avatarURL && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.avatarURL}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BotStatus)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Appearance
        </h2>

        <div className="space-y-4">
          {/* Buttons Background Color */}
          <div>
            <label
              htmlFor="buttonsBackground"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Buttons Background Color (Optional)
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <input
                type="color"
                id="buttonsBackground"
                value={buttonsBackground || "#FFFFFF"}
                onChange={(e) => setButtonsBackground(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={buttonsBackground || ""}
                onChange={(e) => setButtonsBackground(e.target.value || null)}
                className={`block flex-1 rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.buttonsBackground
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="#FFFFFF"
                pattern="^#[0-9A-F]{6}$"
              />
            </div>
            {errors.buttonsBackground && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.buttonsBackground}
              </p>
            )}
          </div>

          {/* Buttons Text Color */}
          <div>
            <label
              htmlFor="buttonsTextColor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Buttons Text Color (Optional)
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <input
                type="color"
                id="buttonsTextColor"
                value={buttonsTextColor || "#000000"}
                onChange={(e) => setButtonsTextColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={buttonsTextColor || ""}
                onChange={(e) => setButtonsTextColor(e.target.value || null)}
                className={`block flex-1 rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.buttonsTextColor
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="#000000"
                pattern="^#[0-9A-F]{6}$"
              />
            </div>
            {errors.buttonsTextColor && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.buttonsTextColor}
              </p>
            )}
          </div>

          {/* Buttons Prefix */}
          <div>
            <label
              htmlFor="buttonsPrefix"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Buttons Prefix (Optional)
            </label>
            <input
              type="text"
              id="buttonsPrefix"
              value={buttonsPrefix || ""}
              onChange={(e) => setButtonsPrefix(e.target.value.trim() || null)}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
              placeholder="Enter buttons prefix"
            />
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Steps
        </h2>

        <div className="space-y-4">
          {/* Welcome Step */}
          <div>
            <label
              htmlFor="welcomeStepId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Welcome Step (Optional)
            </label>
            <select
              id="welcomeStepId"
              value={welcomeStepId || ""}
              onChange={(e) => setWelcomeStepId(e.target.value || null)}
              disabled={isLoadingSteps}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
            >
              <option value="">-- Select Welcome Step --</option>
              {steps.map((step) => (
                <option key={step.id} value={step.id}>
                  {step.humanReadableName}
                </option>
              ))}
            </select>
            {isLoadingSteps && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Loading steps...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Advanced
        </h2>

        <div className="space-y-4">
          {/* Google Analytics Key */}
          <div>
            <label
              htmlFor="GAKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Google Analytics Key (Optional)
            </label>
            <input
              type="text"
              id="GAKey"
              value={GAKey || ""}
              onChange={(e) => setGAKey(e.target.value.trim() || null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Enter Google Analytics key"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 border-t border-gray-200 pt-6 dark:border-gray-700">
        <button
          type="submit"
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-800"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
};

