"use client";

/**
 * MessagePreview Component
 *
 * Displays a visual preview of a message showing how it will appear in Viber.
 * Shows different previews based on message type in a phone-like frame.
 */

import { useState, useEffect } from "react";
import type { MessageType } from "@/domains/message/types";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";
import type { ApiResponse } from "@vbar/shared";
import KeyboardPreview from "@/components/bot/keyboard/KeyboardPreview";

interface MessagePreviewProps {
  /**
   * Message type
   */
  type: MessageType;

  /**
   * Message content (type-specific structure)
   */
  content: object;

  /**
   * URL for url-type messages
   */
  url?: string | null;
}

const MessagePreview = ({ type, content, url }: MessagePreviewProps) => {
  const [keyboard, setKeyboard] = useState<KeyboardDTO | null>(null);
  const [isLoadingKeyboard, setIsLoadingKeyboard] = useState(false);

  // Fetch keyboard data for keyboard message type
  useEffect(() => {
    if (type === "keyboard") {
      const contentData = content as any;
      const keyboardId =
        contentData.keyboard && typeof contentData.keyboard === "object"
          ? (contentData.keyboard.id as string | undefined)
          : undefined;

      if (keyboardId) {
        setIsLoadingKeyboard(true);
        fetch(`/api/keyboards/${keyboardId}`)
          .then((res) => res.json())
          .then((data: ApiResponse<KeyboardDTO>) => {
            if (data.data) {
              setKeyboard(data.data);
            }
          })
          .catch((err) => {
            console.error("Error fetching keyboard:", err);
          })
          .finally(() => {
            setIsLoadingKeyboard(false);
          });
      } else {
        setKeyboard(null);
      }
    } else {
      setKeyboard(null);
    }
  }, [type, content]);

  // Render preview based on message type
  const renderPreview = () => {
    const contentData = content as any;

    switch (type) {
      case "text":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="max-w-[280px] rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                {contentData.text || "No text content"}
              </p>
            </div>
          </div>
        );

      case "picture":
        return (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white shadow-sm dark:bg-gray-800">
              {contentData.media ? (
                <img
                  src={contentData.media}
                  alt="Preview"
                  className="w-full rounded-t-lg object-cover"
                  style={{ maxHeight: "300px" }}
                  onError={(e) => {
                    // Show placeholder on error
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const placeholder =
                      target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = "flex";
                  }}
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No image URL
                  </p>
                </div>
              )}
              <div
                className="hidden flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-700"
                style={{ minHeight: "200px" }}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Image failed to load
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {contentData.media}
                </p>
              </div>
              {contentData.text && (
                <div className="p-3">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {contentData.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "video":
        return (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white shadow-sm dark:bg-gray-800">
              {contentData.media ? (
                <div className="relative">
                  <video
                    src={contentData.media}
                    className="w-full rounded-t-lg"
                    style={{ maxHeight: "300px" }}
                    controls
                    onError={(e) => {
                      // Show placeholder on error
                      const target = e.target as HTMLVideoElement;
                      target.style.display = "none";
                      const placeholder =
                        target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                  <div
                    className="hidden flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-700"
                    style={{ minHeight: "200px" }}
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Video failed to load
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {contentData.media}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No video URL
                  </p>
                </div>
              )}
              {contentData.text && (
                <div className="p-3">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {contentData.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "file":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {contentData.file_name || "File"}
                  </p>
                  {contentData.size && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(contentData.size / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "location":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white shadow-sm dark:bg-gray-800">
              <div className="flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-700">
                {contentData.lat && contentData.lon ? (
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {contentData.lat.toFixed(6)}, {contentData.lon.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No location data
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <svg
                    className="h-6 w-6 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {contentData.name || "Contact Name"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {contentData.phone_number || "Phone Number"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "sticker":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sticker
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  ID: {contentData.sticker_id || "N/A"}
                </p>
              </div>
            </div>
          </div>
        );

      case "url":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {url || "No URL"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Link
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "keyboard":
        if (isLoadingKeyboard) {
          return (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading keyboard...
              </p>
            </div>
          );
        }

        if (keyboard) {
          return (
            <div className="flex h-full items-center justify-center">
              <KeyboardPreview
                buttons={keyboard.Buttons}
                bgColor={keyboard.BgColor}
                title={keyboard.title}
                inputFieldState={keyboard.InputFieldState}
              />
            </div>
          );
        }

        return (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No keyboard selected
            </p>
          </div>
        );

      case "rich-media":
        return (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-[280px] rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Rich media carousel preview not yet implemented
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unknown message type
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center p-2">
      {/* Phone Frame */}
      <div className="relative">
        {/* Phone Border/Frame */}
        <div className="relative rounded-[2.5rem] border-[12px] border-gray-800 bg-gray-800 dark:border-gray-300 dark:bg-gray-300 shadow-2xl">
          {/* Screen Bezel */}
          <div className="relative overflow-hidden rounded-[1.5rem] bg-black dark:bg-gray-900">
            {/* Notch (optional) */}
            <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-800 dark:bg-gray-300"></div>

            {/* Screen Content */}
            <div
              className="relative flex h-[600px] w-[320px] flex-col"
              style={{
                backgroundColor: "#f5f5f5",
              }}
            >
              {/* Message Preview Content */}
              {renderPreview()}
            </div>

            {/* Home Indicator (iOS style) */}
            <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30 dark:bg-white/50"></div>
          </div>
        </div>

        {/* Phone Frame Shadow */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-gray-900/20 dark:from-gray-100/20 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
};

export default MessagePreview;




