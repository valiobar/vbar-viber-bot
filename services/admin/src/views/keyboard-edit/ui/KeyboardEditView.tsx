"use client";

/**
 * Keyboard edit view
 *
 * Route body for `/keyboards/[id]`. Fetches the keyboard, then submits via entity api.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { KeyboardForm } from "@/features/keyboard-manage";
import { HttpError } from "@/shared";
import {
  getKeyboard,
  updateKeyboard,
  type KeyboardDTO,
  type UpdateKeyboardInput,
} from "@/entities/keyboard";

export const KeyboardEditView = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [keyboard, setKeyboard] = useState<KeyboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingButton, setIsEditingButton] = useState(false);

  useEffect(() => {
    const fetchKeyboard = async () => {
      try {
        setIsLoading(true);
        const data = await getKeyboard(id);
        setKeyboard(data);
      } catch (err) {
        console.error("Error fetching keyboard:", err);
        if (err instanceof HttpError && err.status === 404) {
          setError("Keyboard not found");
        } else {
          setError("Failed to load keyboard");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchKeyboard();
    }
  }, [id]);

  const handleSubmit = async (data: UpdateKeyboardInput): Promise<void> => {
    try {
      await updateKeyboard(id, data);
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
};
