"use client";

/**
 * Step Edit Page
 *
 * Displays a form for editing an existing step.
 * Fetches step by ID and uses StepForm component in edit mode.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import StepForm from "@/components/bot/step/StepForm";
import type { CreateStepInput } from "@/domains/step/ports/in/CreateStepUseCase";
import type { UpdateStepInput } from "@/domains/step/ports/in/UpdateStepUseCase";
import type { ApiResponse } from "@vbar/shared";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";

export default function StepEditPage() {
  const router = useRouter();
  const params = useParams();
  const stepId = params?.id as string;

  const [step, setStep] = useState<StepDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  /**
   * Fetch step by ID
   */
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

        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const url = `${baseUrl}/api/steps/${stepId}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for authentication
        });

        if (response.status === 404) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to fetch step");
        }

        const responseData: ApiResponse<StepDTO> = await response.json();
        if (responseData.data) {
          setStep(responseData.data);
        } else {
          setNotFound(true);
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

  /**
   * Handle form submission for updating step
   */
  const handleSubmit = async (
    data: CreateStepInput | UpdateStepInput
  ): Promise<void> => {
    if (!stepId) {
      throw new Error("Step ID is required");
    }

    // Type assertion: In edit mode, data is always UpdateStepInput
    const updateData = data as UpdateStepInput;

    try {
      setIsSubmitting(true);
      setError(null);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/steps/${stepId}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update step");
      }

      // Redirect to steps list on success
      router.push("/steps");
      router.refresh();
    } catch (err) {
      console.error("Error updating step:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    router.push("/steps");
  };

  // Loading state
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

  // Not found state
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
            onClick={() => router.push("/steps")}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Back to Steps
          </button>
        </div>
      </main>
    );
  }

  // Error state
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
              onClick={() => router.push("/steps")}
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

  // Render form with step data
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
}
