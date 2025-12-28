"use client";

/**
 * Message Create Page
 *
 * Displays a form for creating a new message.
 * Uses MessageForm component for the form display.
 */

import { useRouter } from "next/navigation";
import MessageForm from "@/components/bot/message/MessageForm";
import type { CreateMessageInput } from "@/domains/message/ports/in/CreateMessageUseCase";
import type { UpdateMessageInput } from "@/domains/message/ports/in/UpdateMessageUseCase";

export default function MessageCreatePage() {
  const router = useRouter();

  /**
   * Handle form submission for creating message
   */
  const handleSubmit = async (
    data: CreateMessageInput | UpdateMessageInput
  ): Promise<void> => {
    // Type assertion: In create mode, data is always CreateMessageInput
    const createData = data as CreateMessageInput;

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/messages`;

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
        throw new Error(errorData.error?.message || "Failed to create message");
      }

      // Redirect to messages list after successful creation
      router.push("/messages");
      router.refresh();
    } catch (err) {
      console.error("Error creating message:", err);
      throw err;
    }
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create Message
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Create a new message with type-specific content
        </p>
      </div>

      <MessageForm onSubmit={handleSubmit} />
    </main>
  );
}
