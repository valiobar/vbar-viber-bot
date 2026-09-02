"use client";

/**
 * StepPreview Component
 *
 * Presentational preview of a step: metadata, triggers, and injected
 * message/keyboard slots (cross-entity composition happens in the parent).
 */

import type { ReactNode } from "react";
import type { StepDTO } from "../model/types";

interface StepPreviewProps {
  /**
   * Step DTO to preview
   */
  step: StepDTO;

  /**
   * Message previews injected by the parent
   */
  messagesSlot?: ReactNode;

  /**
   * Keyboard preview injected by the parent
   */
  keyboardSlot?: ReactNode;

  /**
   * Whether related messages are still loading
   */
  isLoadingMessages?: boolean;

  /**
   * Whether the related keyboard is still loading
   */
  isLoadingKeyboard?: boolean;

  /**
   * Count of successfully loaded messages (for the badge)
   */
  messageCount?: number;

  /**
   * Number of messages that failed to load
   */
  failedMessageCount?: number;
}

export const StepPreview = ({
  step,
  messagesSlot,
  keyboardSlot,
  isLoadingMessages = false,
  isLoadingKeyboard = false,
  messageCount = 0,
  failedMessageCount = 0,
}: StepPreviewProps) => {
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
              {messageCount} {messageCount === 1 ? "Message" : "Messages"}
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
        ) : messagesSlot ? (
          <div className="space-y-6">
            {messagesSlot}
            {failedMessageCount > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Failed to load {failedMessageCount}{" "}
                  {failedMessageCount === 1 ? "message" : "messages"}
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
          ) : keyboardSlot ? (
            keyboardSlot
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
