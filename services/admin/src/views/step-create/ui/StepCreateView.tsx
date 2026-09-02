"use client";

/**
 * Step create view
 *
 * Route body for `/steps/new`. Submits via the step entity api.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepForm } from "@/features/step-manage";
import {
  createStep,
  type CreateStepInput,
  type UpdateStepInput,
} from "@/entities/step";

export const StepCreateView = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    data: CreateStepInput | UpdateStepInput
  ): Promise<void> => {
    const createData = data as CreateStepInput;

    setIsLoading(true);
    setError(null);

    try {
      await createStep(createData);
      router.push("/steps");
      router.refresh();
    } catch (err) {
      console.error("Error creating step:", err);
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
};
