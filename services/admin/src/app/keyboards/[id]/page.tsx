"use client";

/**
 * Keyboard Edit Page
 *
 * Displays a form for editing an existing keyboard.
 * Uses KeyboardForm component for the form display.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KeyboardForm from "@/components/bot/keyboard/KeyboardForm";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";
import type { ApiResponse } from "@vbar/shared";
import type { UpdateKeyboardInput } from "@/domains/keyboard/ports/in/UpdateKeyboardUseCase";

interface KeyboardEditPageProps {
  params: {
    id: string;
  };
}

export default function KeyboardEditPage({ params }: KeyboardEditPageProps) {
  const router = useRouter();
  const { id } = params;
  const [keyboard, setKeyboard] = useState<KeyboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingButton, setIsEditingButton] = useState(false);

  /**
   * Fetch keyboard data
   */
  useEffect(() => {
    async function fetchKeyboard() {
      try {
        setIsLoading(true);
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const url = `${baseUrl}/api/keyboards/${id}`;

        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError("Keyboard not found");
          } else {
            setError("Failed to load keyboard");
          }
          return;
        }

        const data: ApiResponse<KeyboardDTO> = await response.json();
        setKeyboard(data.data || null);
      } catch (err) {
        console.error("Error fetching keyboard:", err);
        setError("Failed to load keyboard");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchKeyboard();
    }
  }, [id]);

  /**
   * Handle form submission for updating keyboard
   */
  const handleSubmit = async (data: UpdateKeyboardInput): Promise<void> => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/keyboards/${id}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to update keyboard"
        );
      }

      // Redirect to keyboards list after successful update
      router.push("/keyboards");
      router.refresh();
    } catch (err) {
      console.error("Error updating keyboard:", err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (error || !keyboard) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-200">
            {error || "Keyboard not found"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {!isEditingButton && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Keyboard
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Update keyboard settings and button layout
          </p>
        </div>
      )}

      <KeyboardForm
        initialData={keyboard}
        onSubmit={handleSubmit}
        onButtonEditModeChange={setIsEditingButton}
      />
    </main>
  );
}
