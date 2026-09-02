"use client";

/**
 * Step edit view
 *
 * Route body for `/steps/[id]/edit`. Fetches the step, then submits via entity api.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { StepForm } from "@/features/step-manage";
import { HttpError } from "@/shared";
import {
  getStep,
  updateStep,
  type CreateStepInput,
  type StepDTO,
  type UpdateStepInput,
} from "@/entities/step";

export const StepEditView = () => {
  const router = useRouter();
  const params = useParams();
  const stepId = params?.id as string;

  const [step, setStep] = useState<StepDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!stepId) {
      setError("Step ID is required");
      setIsLoading(false);
      return;
    }

    const fetchStep = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setNotFound(false);

        try {
          const data = await getStep(stepId);
          setStep(data);
        } catch (err) {
          if (err instanceof HttpError && err.status === 404) {
            setNotFound(true);
            return;
          }
          throw err;
        }
      } catch (err) {
        console.error("Error fetching step:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch step");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStep();
  }, [stepId]);

  const handleSubmit = async (
    data: CreateStepInput | UpdateStepInput
  ): Promise<void> => {
    if (!stepId) {
      throw new Error("Step ID is required");
    }

    const updateData = data as UpdateStepInput;

    try {
      setIsSubmitting(true);
      setError(null);

      await updateStep(stepId, updateData);
      router.push("/steps");
      router.refresh();
    } catch (err) {
      console.error("Error updating step:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/steps");
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading step...</p>
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h1 className="mb-2 text-2xl font-bold text-red-800 dark:text-red-400">
            Step Not Found
          </h1>
          <p className="mb-4 text-red-600 dark:text-red-300">
            The step you are trying to edit does not exist or has been deleted.
          </p>
          <button
            onClick={handleCancel}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Back to Steps
          </button>
        </div>
      </main>
    );
  }

  if (error && !step) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h1 className="mb-2 text-2xl font-bold text-red-800 dark:text-red-400">
            Error Loading Step
          </h1>
          <p className="mb-4 text-red-600 dark:text-red-300">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={handleCancel}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Back to Steps
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Step
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Update step details, triggers, and content
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {step && (
        <StepForm
          initialData={step}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      )}
    </main>
  );
};
