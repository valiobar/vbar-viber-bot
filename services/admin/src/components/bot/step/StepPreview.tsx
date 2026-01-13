"use client";

/**
 * StepPreview Component
 *
 * Displays a visual preview of a step showing its structure:
 * - Step metadata (name, hidden status)
 * - Trigger strings
 * - Associated messages (previews or names)
 * - Associated keyboard (if any)
 */

import { useState, useEffect } from "react";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";
import type { ApiResponse } from "@vbar/shared";
import MessagePreview from "@/components/bot/message/MessagePreview";
import KeyboardPreview from "@/components/bot/keyboard/KeyboardPreview";

interface StepPreviewProps {
  /**
   * Step DTO to preview
   */
  step: StepDTO;
}

const StepPreview = ({ step }: StepPreviewProps) => {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [keyboard, setKeyboard] = useState<KeyboardDTO | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingKeyboard, setIsLoadingKeyboard] = useState(false);
  const [messageErrors, setMessageErrors] = useState<Set<string>>(new Set());

  /**
   * Fetch messages for content array
   */
  useEffect(() => {
    if (step.content && step.content.length > 0) {
      setIsLoadingMessages(true);
      setMessageErrors(new Set());

      // Fetch each message by ID
      const fetchPromises = step.content.map((messageId) =>
        fetch(`/api/messages/${messageId}`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch message ${messageId}`);
            }
            return res.json();
          })
          .then((data: ApiResponse<MessageDTO>) => {
            if (data.data) {
              return data.data;
            }
            throw new Error(`Message ${messageId} not found`);
          })
          .catch((err) => {
            console.error(`Error fetching message ${messageId}:`, err);
            setMessageErrors((prev) => new Set(prev).add(messageId));
            return null;
          })
      );

      Promise.all(fetchPromises).then((results) => {
        const validMessages = results.filter(
          (msg): msg is MessageDTO => msg !== null
        );
        setMessages(validMessages);
        setIsLoadingMessages(false);
      });
    } else {
      setMessages([]);
      setIsLoadingMessages(false);
    }
  }, [step.content]);

  /**
   * Fetch keyboard if keyboard ID is provided
   */
  useEffect(() => {
    if (step.keyboard) {
      setIsLoadingKeyboard(true);
      fetch(`/api/keyboards/${step.keyboard}`)
        .then((res) => res.json())
        .then((data: ApiResponse<KeyboardDTO>) => {
          if (data.data) {
            setKeyboard(data.data);
          } else {
            setKeyboard(null);
          }
        })
        .catch((err) => {
          console.error("Error fetching keyboard:", err);
          setKeyboard(null);
        })
        .finally(() => {
          setIsLoadingKeyboard(false);
        });
    } else {
      setKeyboard(null);
      setIsLoadingKeyboard(false);
    }
  }, [step.keyboard]);

  return (
    <div className="space-y-6">
      {/* Step Metadata Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step.humanReadableName}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Step Preview
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {step.hidden && (
              <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Hidden
              </span>
            )}
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {messages.length} {messages.length === 1 ? "Message" : "Messages"}
            </span>
          </div>
        </div>

        {/* Trigger Strings */}
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Trigger Strings:
          </h4>
          <div className="flex flex-wrap gap-2">
            {step.trigger && step.trigger.length > 0 ? (
              step.trigger.map((trigger, index) => (
                <span
                  key={index}
                  className="inline-flex rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  {trigger}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                No triggers
              </span>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Created: {new Date(step.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(step.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Messages Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Messages ({step.content.length})
        </h4>

        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Loading messages...
              </p>
            </div>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Message {index + 1}: {message.humanReadableName}
                  </h5>
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {message.type}
                  </span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <MessagePreview
                    type={message.type}
                    content={message.content}
                    url={message.url}
                  />
                </div>
              </div>
            ))}
            {messageErrors.size > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Failed to load {messageErrors.size}{" "}
                  {messageErrors.size === 1 ? "message" : "messages"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No messages assigned to this step
            </p>
          </div>
        )}
      </div>

      {/* Keyboard Section */}
      {step.keyboard && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard
          </h4>

          {isLoadingKeyboard ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading keyboard...
                </p>
              </div>
            </div>
          ) : keyboard ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {keyboard.title || "Keyboard"}
                </h5>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                <KeyboardPreview
                  buttons={keyboard.Buttons}
                  bgColor={keyboard.BgColor}
                  title={keyboard.title}
                  inputFieldState={keyboard.InputFieldState}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200">
                Failed to load keyboard
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepPreview;




