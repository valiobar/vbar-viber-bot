/**
 * Custom Response Handlers Registry
 *
 * Maps custom response handler names (shared with the admin service via
 * CUSTOM_RESPONSE_HANDLER_NAMES in @vbar/shared) to their implementations.
 *
 * The `satisfies` constraint makes a missing or extra entry a compile error,
 * keeping this registry in sync with the admin StepForm select.
 */

import { CustomResponseHandlerName } from "@vbar/shared";
import { CustomResponseHandler } from "./types";
import { exampleResponseHandler } from "./handlers/example";
import { locationHandler } from "./handlers/location";

export type {
  CustomResponseContext,
  CustomResponseHandler,
  InboundMessageType,
} from "./types";

/**
 * Registry of custom response handlers keyed by name
 */
export const customResponseHandlers = {
  example: exampleResponseHandler,
  locationHandler,
} satisfies Record<CustomResponseHandlerName, CustomResponseHandler>;

/**
 * Resolve a custom response handler by name
 *
 * @param name - Handler name stored on the step (step.responseHandler)
 * @returns The handler function, or undefined if the name is not registered
 */
export function getCustomResponseHandler(
  name: string
): CustomResponseHandler | undefined {
  return (customResponseHandlers as Record<string, CustomResponseHandler>)[
    name
  ];
}
