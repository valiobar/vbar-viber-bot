"use client";

/**
 * Message Edit Page
 *
 * Displays a form for editing an existing message.
 * Fetches message by ID and uses MessageForm component in edit mode.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MessageForm from "@/components/bot/message/MessageForm";
import type { CreateMessageInput } from "@/domains/message/ports/in/CreateMessageUseCase";
import type { UpdateMessageInput } from "@/domains/message/ports/in/UpdateMessageUseCase";
import type { ApiResponse } from "@vbar/shared";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";

export default function MessageEditPage() {
  const router = useRouter();
  const params = useParams();
  const messageId = params?.id as string;

  const [message, setMessage] = useState<MessageDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  /**
   * Fetch message by ID
   */
  useEffect(() => {
    if (!messageId) {
      setError("Message ID is required");
      setIsLoading(false);
      return;
    }

    const fetchMessage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setNotFound(false);

        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const url = `${baseUrl}/api/messages/${messageId}`;

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
          throw new Error(
            errorData.error?.message || "Failed to fetch message"
          );
        }

        const responseData: ApiResponse<MessageDTO> = await response.json();
        if (responseData.data) {
          setMessage(responseData.data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error fetching message:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch message"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessage();
  }, [messageId]);

  /**
   * Handle form submission for updating message
   */
  const handleSubmit = async (
    data: CreateMessageInput | UpdateMessageInput
  ): Promise<void> => {
    if (!messageId) {
      throw new Error("Message ID is required");
    }

    // Type assertion: In edit mode, data is always UpdateMessageInput
    const updateData = data as UpdateMessageInput;

    try {
      setIsSubmitting(true);
      setError(null);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/messages/${messageId}`;

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
        throw new Error(errorData.error?.message || "Failed to update message");
      }

      // Redirect to messages list on success
      router.push("/messages");
      router.refresh();
    } catch (err) {
      console.error("Error updating message:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    router.push("/messages");
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading message...
            </p>
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
            Message Not Found
          </h1>
          <p className="mb-4 text-red-600 dark:text-red-300">
            The message you are trying to edit does not exist or has been
            deleted.
          </p>
          <button
            onClick={() => router.push("/messages")}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Back to Messages
          </button>
        </div>
      </main>
    );
  }

  // Error state
  if (error && !message) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h1 className="mb-2 text-2xl font-bold text-red-800 dark:text-red-400">
            Error Loading Message
          </h1>
          <p className="mb-4 text-red-600 dark:text-red-300">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push("/messages")}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Back to Messages
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

  // Render form with message data
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Message
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Update message details and content
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {message && (
        <MessageForm
          initialData={message}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      )}
    </main>
  );
}
