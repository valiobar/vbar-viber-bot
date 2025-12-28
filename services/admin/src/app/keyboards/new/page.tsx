"use client";

/**
 * Keyboard Create Page
 *
 * Displays a form for creating a new keyboard.
 * Uses KeyboardForm component for the form display.
 */

import { useRouter } from "next/navigation";
import KeyboardForm from "@/components/bot/keyboard/KeyboardForm";
import type { CreateKeyboardInput } from "@/domains/keyboard/ports/in/CreateKeyboardUseCase";
import type { UpdateKeyboardInput } from "@/domains/keyboard/ports/in/UpdateKeyboardUseCase";
import type { ApiResponse } from "@vbar/shared";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";

export default function KeyboardCreatePage() {
  const router = useRouter();

  /**
   * Handle form submission for creating keyboard
   */
  const handleSubmit = async (
    data: CreateKeyboardInput | UpdateKeyboardInput
  ): Promise<void> => {
    // Type assertion: In create mode, data is always CreateKeyboardInput
    const createData = data as CreateKeyboardInput;

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/keyboards`;

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
        throw new Error(
          errorData.error?.message || "Failed to create keyboard"
        );
      }

      // Redirect to keyboards list or the created keyboard
      const responseData: ApiResponse<KeyboardDTO> = await response.json();
      if (responseData.data?.id) {
        router.push(`/keyboards/${responseData.data.id}`);
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
}
