"use client";

/**
 * Keyboard create view
 *
 * Route body for `/keyboards/new`. Submits via the keyboard entity api.
 */

import { useRouter } from "next/navigation";
import { KeyboardForm } from "@/features/keyboard-manage";
import {
  createKeyboard,
  type CreateKeyboardInput,
  type UpdateKeyboardInput,
} from "@/entities/keyboard";

export const KeyboardCreateView = () => {
  const router = useRouter();

  const handleSubmit = async (
    data: CreateKeyboardInput | UpdateKeyboardInput
  ): Promise<void> => {
    const createData = data as CreateKeyboardInput;

    try {
      const created = await createKeyboard(createData);
      if (created.id) {
        router.push(`/keyboards/${created.id}`);
      } else {
        router.push("/keyboards");
      }
      router.refresh();
    } catch (err) {
      console.error("Error creating keyboard:", err);
      throw err;
    }
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create Keyboard
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Create a new keyboard with button layout
        </p>
      </div>

      <KeyboardForm onSubmit={handleSubmit} />
    </main>
  );
};
