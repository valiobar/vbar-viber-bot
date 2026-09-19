"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./CloseIcon";

export interface AiChatMessage {
  role: "bot" | "user";
  text: string;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  /** Drawer header text — also used as the region aria-label. */
  title: string;
  messages: AiChatMessage[];
  isGenerating: boolean;
  onClose: () => void;
  /** Phase-specific controls rendered pinned at the bottom (feature-owned). */
  children: ReactNode;
}

export const AiChatDrawer = ({
  isOpen,
  title,
  messages,
  isGenerating,
  onClose,
  children,
}: AiChatDrawerProps) => {
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const list = messageListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [isOpen, messages, isGenerating]);

  return (
    <aside
      role="complementary"
      aria-label={title}
      aria-hidden={!isOpen}
      data-testid="ai-chat-drawer"
      className={`flex h-screen shrink-0 flex-col overflow-hidden bg-white transition-[width] duration-300 dark:bg-gray-800 ${
        isOpen
          ? "w-full max-w-md border-l border-gray-200 dark:border-gray-700"
          : "w-0 border-0"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI chat"
          data-testid="ai-chat-close"
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "bot" ? "flex justify-start" : "flex justify-end"}
          >
            <div
              className={
                message.role === "bot"
                  ? "max-w-[80%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "max-w-[80%] rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
              }
            >
              {message.text}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="animate-pulse rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700">
              Generating…
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">{children}</div>
    </aside>
  );
};
