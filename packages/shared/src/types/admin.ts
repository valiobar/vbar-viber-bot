/**
 * Types for Admin Service
 */

import { BaseEntity } from "./common";

/**
 * User interface
 */
export interface User extends BaseEntity {
  username: string;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  lastLoginAt?: string;
}

// ============================================================================
// Message Domain Types
// ============================================================================

/**
 * Message type enum
 *
 * Valid message types supported by Viber API
 */
export type MessageType =
  | "text"
  | "url"
  | "contact"
  | "picture"
  | "video"
  | "file"
  | "location"
  | "sticker"
  | "rich-media"
  | "keyboard";

// ============================================================================
// Keyboard Domain Types
// ============================================================================

/**
 * Button action type enum
 *
 * Valid action types supported by Viber API
 */
export type ActionType =
  | "reply"
  | "open-url"
  | "location-picker"
  | "share-phone"
  | "none";

/**
 * Text size enum
 */
export type TextSize = "small" | "regular" | "large";

/**
 * Vertical text alignment enum
 */
export type TextVAlign = "top" | "bottom" | "middle";

/**
 * Horizontal text alignment enum
 */
export type TextHAlign = "left" | "center" | "right";

/**
 * Background media type enum
 */
export type BgMediaType = "picture" | "gif";

/**
 * URL open type enum
 */
export type OpenURLType = "internal" | "external";

/**
 * Internal browser mode enum
 */
export type InternalBrowserMode =
  | "fullscreen-portrait"
  | "fullscreen-landscape"
  | "partial-size";

/**
 * Input field state enum
 */
export type InputFieldState = "regular" | "minimized" | "hidden";

/**
 * Internal browser configuration
 */
export interface InternalBrowserConfig {
  Mode: InternalBrowserMode;
}

// ============================================================================
// DTO Interfaces (Data Transfer Objects)
// ============================================================================

/**
 * Custom step handler names
 *
 * Source of truth for custom step handlers implemented in the viber service
 * (services/viber/src/application/custom-steps). The admin StepForm select and
 * the viber registry are both typed against this list, so they stay in sync
 * at compile time.
 */
export const CUSTOM_STEP_HANDLER_NAMES = ["example"] as const;

export type CustomStepHandlerName = (typeof CUSTOM_STEP_HANDLER_NAMES)[number];

/**
 * Step DTO interface
 *
 * Data structure for transferring Step data between services.
 * This is a plain data structure without business logic.
 */
export interface StepDTO extends BaseEntity {
  humanReadableName: string;
  trigger: string[];
  content: string[]; // Array of Message IDs
  keyboard: string | null; // Optional Keyboard ID
  hidden: boolean;
  isAi: boolean;
  customHandler: string | null; // Optional custom step handler name (replaces normal sending)
  /** Optional AI prompt name (AI service prompt_templates.name); null = use the active prompt */
  aiPromptName: string | null;
}

/**
 * Message DTO interface
 *
 * Data structure for transferring Message data between services.
 * This is a plain data structure without business logic.
 * Content is represented as plain object instead of MessageContent value object.
 */
export interface MessageDTO extends BaseEntity {
  type: MessageType;
  content: object; // Plain object, not MessageContent
  url: string | null;
  humanReadableName: string;
  hidden: boolean;
}

/**
 * Button DTO interface
 *
 * Data structure for transferring Button data between services.
 * This is a plain data structure without business logic.
 */
export interface ButtonDTO extends BaseEntity {
  Columns: number;
  Rows: number;
  Text: string;
  TextColor: string;
  BgColor: string | null;
  BgMedia: string | null;
  BgMediaType: BgMediaType;
  BgMediaScaleType: string;
  BgLoop: boolean;
  ActionType: ActionType;
  ActionBody: string;
  OpenURLType: OpenURLType;
  InternalBrowser: InternalBrowserConfig;
  TextVAlign: TextVAlign;
  TextHAlign: TextHAlign;
  TextSize: TextSize;
  Silent: boolean;
  isJson: boolean;
}

/**
 * Keyboard DTO interface
 *
 * Data structure for transferring Keyboard data between services.
 * This is a plain data structure without business logic.
 * Buttons are represented as ButtonDTO[] instead of Button entities.
 */
export interface KeyboardDTO extends BaseEntity {
  type: "keyboard";
  Buttons: ButtonDTO[];
  DefaultHeight: boolean;
  InputFieldState: InputFieldState;
  BgColor: string | null;
  hidden: boolean;
  humanReadableName: string;
  title: string | null;
  isBroadcast: boolean;
  isTemplate: boolean;
}

// ============================================================================
// Carousel Domain Types (rich_media)
// ============================================================================

/** Action types allowed for structured-card CTA buttons */
export type CarouselCtaActionType = "reply" | "open-url" | "none";

/** CTA button inside a structured carousel card (1 row, full card width) */
export interface CarouselCtaDTO {
  text: string;
  textColor: string;
  bgColor: string | null;
  actionType: CarouselCtaActionType;
  actionBody: string;
  openURLType: OpenURLType;
  silent: boolean;
}

export type CarouselCardMode = "structured" | "custom";

/**
 * One carousel card. `structured` cards use image/title/description/ctaButtons
 * and are flattened server-side; `custom` cards carry raw Buttons (Rows 1-7).
 */
export interface CarouselCardDTO {
  mode: CarouselCardMode;
  // structured mode fields
  image: string | null;
  title: string;
  titleColor: string; // default "#323232"
  description: string;
  descriptionColor: string; // default "#777777"
  textRows: number; // 1-3, rows reserved for the title/description block
  ctaButtons: CarouselCtaDTO[];
  // custom mode field (ButtonDTO reused; Rows validated 1..ButtonsGroupRows)
  Buttons: ButtonDTO[];
}

/**
 * Carousel DTO (rich_media message payload source).
 * `Cards` is the editor's source of truth; `Buttons` is the flattened,
 * Viber-shaped layout computed by the admin service on save.
 */
export interface CarouselDTO extends BaseEntity {
  type: "rich_media";
  humanReadableName: string;
  hidden: boolean;
  BgColor: string | null;
  ButtonsGroupColumns: number; // 1-6, default 6
  ButtonsGroupRows: number; // 1-7, default 7
  Cards: CarouselCardDTO[];
  Buttons: ButtonDTO[]; // computed on save
}
