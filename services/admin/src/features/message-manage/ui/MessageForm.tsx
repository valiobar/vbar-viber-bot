"use client";

/**
 * MessageForm Component
 *
 * Form for creating/editing Messages with type-specific fields.
 * Supports all message types with validation and preview.
 */

import { useState, useEffect } from "react";
import type {
  CreateMessageInput,
  MessageDTO,
  MessageType,
  UpdateMessageInput,
} from "@/entities/message";
import { getKeyboard, listKeyboards, type KeyboardDTO } from "@/entities/keyboard";
import { TextMessageFields } from "./fields/TextMessageFields";
import { UrlMessageFields } from "./fields/UrlMessageFields";
import { PictureMessageFields } from "./fields/PictureMessageFields";
import { VideoMessageFields } from "./fields/VideoMessageFields";
import { FileMessageFields } from "./fields/FileMessageFields";
import { LocationMessageFields } from "./fields/LocationMessageFields";
import { ContactMessageFields } from "./fields/ContactMessageFields";
import { StickerMessageFields } from "./fields/StickerMessageFields";
import { KeyboardMessageFields } from "./fields/KeyboardMessageFields";
import { RichMediaMessageFields } from "./fields/RichMediaMessageFields";

interface MessageFormProps {
  /**
   * Initial message data for editing (optional)
   * If not provided, form is in create mode
   */
  initialData?: MessageDTO;

  /**
   * Callback when form is submitted
   */
  onSubmit: (data: CreateMessageInput | UpdateMessageInput) => Promise<void>;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether form is in loading state
   */
  isLoading?: boolean;
}

const messageTypes: MessageType[] = [
  "text",
  "url",
  "contact",
  "picture",
  "video",
  "file",
  "location",
  "sticker",
  "rich-media",
  "keyboard",
];

export const MessageForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: MessageFormProps) => {
  // Form state
  const [type, setType] = useState<MessageType>(initialData?.type || "text");
  const [humanReadableName, setHumanReadableName] = useState("");
  const [hidden, setHidden] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  // Type-specific content state
  const [textContent, setTextContent] = useState("");
  const [pictureMedia, setPictureMedia] = useState("");
  const [pictureText, setPictureText] = useState("");
  const [pictureThumbnail, setPictureThumbnail] = useState("");
  const [videoMedia, setVideoMedia] = useState("");
  const [videoText, setVideoText] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [videoSize, setVideoSize] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [fileMedia, setFileMedia] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLon, setLocationLon] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [stickerId, setStickerId] = useState<number | null>(null);
  const [keyboardId, setKeyboardId] = useState<string | null>(null);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyboards, setKeyboards] = useState<KeyboardDTO[]>([]);
  const [isLoadingKeyboards, setIsLoadingKeyboards] = useState(false);

  /**
   * Fetch keyboards for keyboard message type
   */
  useEffect(() => {
    if (type !== "keyboard") {
      return;
    }

    const loadKeyboards = async () => {
      setIsLoadingKeyboards(true);
      try {
        const data = await listKeyboards(
          { hidden: false, isTemplate: false },
          { limit: 100 }
        );
        let options = data.keyboards;
        const currentId =
          initialData?.type === "keyboard"
            ? ((initialData.content as { keyboard?: { id?: string } }).keyboard
                ?.id ?? keyboardId)
            : keyboardId;
        if (currentId && !options.some((kb) => kb.id === currentId)) {
          const current = await getKeyboard(currentId);
          options = [current, ...options];
        }
        setKeyboards(options);
      } catch (err) {
        console.error("Error fetching keyboards:", err);
      } finally {
        setIsLoadingKeyboards(false);
      }
    };

    void loadKeyboards();
  }, [type, initialData]);

  /**
   * Initialize form with initial data
   */
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setHumanReadableName(initialData.humanReadableName);
      setHidden(initialData.hidden);
      setUrl(initialData.url);

      // Initialize type-specific content
      const content = initialData.content as any;

      if (initialData.type === "text" && content.text) {
        setTextContent(content.text);
      } else if (initialData.type === "picture") {
        setPictureMedia(content.media || "");
        setPictureText(content.text || "");
        setPictureThumbnail(content.thumbnail || "");
      } else if (initialData.type === "video") {
        setVideoMedia(content.media || "");
        setVideoText(content.text || "");
        setVideoThumbnail(content.thumbnail || "");
        setVideoSize(content.size || null);
        setVideoDuration(content.duration || null);
      } else if (initialData.type === "file") {
        setFileMedia(content.media || "");
        setFileSize(content.size || null);
        setFileName(content.file_name || "");
      } else if (initialData.type === "location") {
        setLocationLat(content.lat || null);
        setLocationLon(content.lon || null);
      } else if (initialData.type === "contact") {
        setContactName(content.name || "");
        setContactPhone(content.phone_number || "");
      } else if (initialData.type === "sticker") {
        setStickerId(content.sticker_id || null);
      } else if (initialData.type === "keyboard") {
        // Keyboard messages can have a keyboard object with id
        if (content.keyboard && typeof content.keyboard === "object") {
          if ("id" in content.keyboard) {
            setKeyboardId(content.keyboard.id as string);
          }
        }
      }
    }
  }, [initialData]);

  /**
   * Build content object based on message type
   */
  const buildContent = (): object => {
    switch (type) {
      case "text":
        return { text: textContent };
      case "picture":
        const pictureContent: any = { media: pictureMedia };
        if (pictureText) pictureContent.text = pictureText;
        if (pictureThumbnail) pictureContent.thumbnail = pictureThumbnail;
        return pictureContent;
      case "video":
        const videoContent: any = { media: videoMedia };
        if (videoText) videoContent.text = videoText;
        if (videoThumbnail) videoContent.thumbnail = videoThumbnail;
        if (videoSize !== null) videoContent.size = videoSize;
        if (videoDuration !== null) videoContent.duration = videoDuration;
        return videoContent;
      case "file":
        const fileContent: any = { media: fileMedia };
        if (fileSize !== null) fileContent.size = fileSize;
        if (fileName) fileContent.file_name = fileName;
        return fileContent;
      case "location":
        return { lat: locationLat, lon: locationLon };
      case "contact":
        return { name: contactName, phone_number: contactPhone };
      case "sticker":
        return { sticker_id: stickerId };
      case "keyboard":
        if (keyboardId) {
          return { keyboard: { id: keyboardId } };
        }
        return { keyboard: {} };
      case "url":
      case "rich-media":
        return {};
      default:
        return {};
    }
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!humanReadableName.trim()) {
      newErrors.humanReadableName = "Name is required";
    }

    if (type === "text" && !textContent.trim()) {
      newErrors.textContent = "Text content is required";
    }

    if (type === "url" && !url?.trim()) {
      newErrors.url = "URL is required for url message type";
    }

    if (type === "picture" && !pictureMedia.trim()) {
      newErrors.pictureMedia = "Media URL is required";
    }

    if (type === "video" && !videoMedia.trim()) {
      newErrors.videoMedia = "Media URL is required";
    }

    if (type === "file" && !fileMedia.trim()) {
      newErrors.fileMedia = "Media URL is required";
    }

    if (type === "location") {
      if (locationLat === null || isNaN(locationLat)) {
        newErrors.locationLat = "Latitude is required";
      }
      if (locationLon === null || isNaN(locationLon)) {
        newErrors.locationLon = "Longitude is required";
      }
    }

    if (type === "contact") {
      if (!contactName.trim()) {
        newErrors.contactName = "Contact name is required";
      }
      if (!contactPhone.trim()) {
        newErrors.contactPhone = "Phone number is required";
      }
    }

    if (type === "sticker") {
      if (stickerId === null || isNaN(stickerId)) {
        newErrors.stickerId = "Sticker ID is required";
      }
    }

    if (type === "keyboard" && !keyboardId) {
      newErrors.keyboardId = "Keyboard selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const content = buildContent();

    if (initialData) {
      // Update mode
      const updateData: UpdateMessageInput = {
        type,
        content,
        url: type === "url" ? url : null,
        humanReadableName: humanReadableName.trim(),
        hidden,
      };
      await onSubmit(updateData);
    } else {
      // Create mode
      const createData: CreateMessageInput = {
        type,
        content,
        url: type === "url" ? url : null,
        humanReadableName: humanReadableName.trim(),
        hidden,
      };
      await onSubmit(createData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Message Information
        </h2>

        <div className="space-y-4">
          {/* Human Readable Name */}
          <div>
            <label
              htmlFor="humanReadableName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="humanReadableName"
              value={humanReadableName}
              onChange={(e) => setHumanReadableName(e.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.humanReadableName
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Enter message name"
              maxLength={100}
            />
            {errors.humanReadableName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.humanReadableName}
              </p>
            )}
          </div>

          {/* Message Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as MessageType)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              disabled={!!initialData} // Don't allow type change when editing
            >
              {messageTypes.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Hidden Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hidden"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
            />
            <label
              htmlFor="hidden"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Hidden
            </label>
          </div>
        </div>
      </div>

      {/* Type-Specific Fields */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Content
        </h2>

        <div className="space-y-4">
          {/* Text Message */}
          {type === "text" && (
            <TextMessageFields
              value={textContent}
              onChange={setTextContent}
              error={errors.textContent}
            />
          )}

          {/* URL Message */}
          {type === "url" && (
            <UrlMessageFields
              value={url}
              onChange={setUrl}
              error={errors.url}
            />
          )}

          {/* Picture Message */}
          {type === "picture" && (
            <PictureMessageFields
              media={pictureMedia}
              text={pictureText}
              thumbnail={pictureThumbnail}
              onMediaChange={setPictureMedia}
              onTextChange={setPictureText}
              onThumbnailChange={setPictureThumbnail}
              errors={errors}
            />
          )}

          {/* Video Message */}
          {type === "video" && (
            <VideoMessageFields
              media={videoMedia}
              text={videoText}
              thumbnail={videoThumbnail}
              size={videoSize}
              duration={videoDuration}
              onMediaChange={setVideoMedia}
              onTextChange={setVideoText}
              onThumbnailChange={setVideoThumbnail}
              onSizeChange={setVideoSize}
              onDurationChange={setVideoDuration}
              errors={errors}
            />
          )}

          {/* File Message */}
          {type === "file" && (
            <FileMessageFields
              media={fileMedia}
              size={fileSize}
              fileName={fileName}
              onMediaChange={setFileMedia}
              onSizeChange={setFileSize}
              onFileNameChange={setFileName}
              errors={errors}
            />
          )}

          {/* Location Message */}
          {type === "location" && (
            <LocationMessageFields
              latitude={locationLat}
              longitude={locationLon}
              onLatitudeChange={setLocationLat}
              onLongitudeChange={setLocationLon}
              errors={errors}
            />
          )}

          {/* Contact Message */}
          {type === "contact" && (
            <ContactMessageFields
              name={contactName}
              phone={contactPhone}
              onNameChange={setContactName}
              onPhoneChange={setContactPhone}
              errors={errors}
            />
          )}

          {/* Sticker Message */}
          {type === "sticker" && (
            <StickerMessageFields
              stickerId={stickerId}
              onChange={setStickerId}
              error={errors.stickerId}
            />
          )}

          {/* Keyboard Message */}
          {type === "keyboard" && (
            <KeyboardMessageFields
              keyboardId={keyboardId}
              keyboards={keyboards}
              isLoading={isLoadingKeyboards}
              onChange={setKeyboardId}
              error={errors.keyboardId}
            />
          )}

          {/* Rich Media Message */}
          {type === "rich-media" && <RichMediaMessageFields />}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : initialData
            ? "Update Message"
            : "Create Message"}
        </button>
      </div>
    </form>
  );
};

