/**
 * Custom Step Handlers Registry
 *
 * Maps custom handler names (shared with the admin service via
 * CUSTOM_STEP_HANDLER_NAMES in @vbar/shared) to their implementations.
 *
 * The `satisfies` constraint makes a missing or extra entry a compile error,
 * keeping this registry in sync with the admin StepForm select.
 */

import { CustomStepHandlerName } from "@vbar/shared";
import { CustomStepHandler } from "./types";
import { exampleHandler } from "./handlers/example";

export type { CustomStepContext, CustomStepHandler } from "./types";

/**
 * Registry of custom step handlers keyed by name
 */
export const customStepHandlers = {
  example: exampleHandler,
} satisfies Record<CustomStepHandlerName, CustomStepHandler>;

/**
 * Resolve a custom step handler by name
 *
 * @param name - Handler name stored on the step (step.customHandler)
 * @returns The handler function, or undefined if the name is not registered
 */
export function getCustomStepHandler(
  name: string
): CustomStepHandler | undefined {
  return (customStepHandlers as Record<string, CustomStepHandler>)[name];
}
