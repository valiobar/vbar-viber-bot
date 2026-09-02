"use client";

/**
 * Message create view
 *
 * Route body for `/messages/new`. Submits via the message entity api.
 */

import { useRouter } from "next/navigation";
import { MessageForm } from "@/features/message-manage";
import {
  createMessage,
  type CreateMessageInput,
  type UpdateMessageInput,
} from "@/entities/message";

export const MessageCreateView = () => {
  const router = useRouter();

  const handleSubmit = async (
    data: CreateMessageInput | UpdateMessageInput
  ): Promise<void> => {
    const createData = data as CreateMessageInput;

    try {
      await createMessage(createData);
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
};
