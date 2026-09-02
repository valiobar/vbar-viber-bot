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
/**
 * Message type enum
 *
 * Valid message types supported by Viber API
 */
export type MessageType = "text" | "url" | "contact" | "picture" | "video" | "file" | "location" | "sticker" | "rich-media" | "keyboard";
/**
 * Button action type enum
 *
 * Valid action types supported by Viber API
 */
export type ActionType = "reply" | "open-url" | "location-picker" | "share-phone" | "none";
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
export type InternalBrowserMode = "fullscreen-portrait" | "fullscreen-landscape" | "partial-size";
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
/**
 * Step DTO interface
 *
 * Data structure for transferring Step data between services.
 * This is a plain data structure without business logic.
 */
export interface StepDTO extends BaseEntity {
    humanReadableName: string;
    trigger: string[];
    content: string[];
    keyboard: string | null;
    hidden: boolean;
    isAi: boolean;
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
    content: object;
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
}
//# sourceMappingURL=admin.d.ts.map