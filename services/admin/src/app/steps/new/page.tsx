"use client";

/**
 * Step Create Page
 *
 * Displays a form for creating a new step.
 * Uses StepForm component for the form display.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import StepForm from "@/components/bot/step/StepForm";
import type { CreateStepInput } from "@/domains/step/ports/in/CreateStepUseCase";
import type { UpdateStepInput } from "@/domains/step/ports/in/UpdateStepUseCase";

export default function StepCreatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission for creating step
   */
  const handleSubmit = async (
    data: CreateStepInput | UpdateStepInput
  ): Promise<void> => {
    // Type assertion: In create mode, data is always CreateStepInput
    const createData = data as CreateStepInput;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/steps`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.error?.message || "Failed to create step";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Redirect to steps list after successful creation
      router.push("/steps");
      router.refresh();
    } catch (err) {
      console.error("Error creating step:", err);
      // Error state is already set above
      setIsLoading(false);
      throw err;
    }
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create Step
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Create a new step with triggers, messages, and optional keyboard
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Error creating step
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <StepForm onSubmit={handleSubmit} isLoading={isLoading} />
    </main>
  );
}
