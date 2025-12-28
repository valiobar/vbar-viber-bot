/**
 * Keyboard Domain Types
 *
 * Type definitions for the Keyboard domain
 */

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
