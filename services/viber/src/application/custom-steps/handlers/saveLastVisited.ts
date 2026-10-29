/**
 * saveLastVisited custom step handler
 *
 * When a step has `customHandler: "saveLastVisited"`, reads lastTitle,
 * lastImage, and lastTrigger from user state (written by a JSON button
 * action body), prepends `{ title, image, trigger }` to state.lastVisited,
 * then removes those three fields from state.
 *
 * A repeat of the same trigger is moved to the front instead of duplicated.
 * Only the first 6 entries are kept. This handler does not send a message.
 * The step's own messages, keyboard, and carousel are sent afterward when
 * the step has content.
 */
import { CustomStepHandler } from "../types";
import { saveLastVisitedToState } from "./lastVisitedState";

export const saveLastVisitedHandler: CustomStepHandler = async (ctx) => {
  const { step, userProfile, userRepository, logger } = ctx;

  const user = await userRepository.findByViberId(userProfile.id);
  if (!user) {
    logger.warn("saveLastVisited: user not found, skipping", {
      stepId: step.id,
      userId: userProfile.id,
    });
    return;
  }

  const result = await saveLastVisitedToState(
    userRepository,
    userProfile.id,
    user.state
  );

  if (!result.saved) {
    logger.info("saveLastVisited: missing visit fields, state unchanged", {
      stepId: step.id,
      userId: userProfile.id,
      hasTitle: Boolean(result.title),
      hasImage: Boolean(result.image),
      hasTrigger: Boolean(result.trigger),
    });
    return;
  }

  logger.info("saveLastVisited saved visit", {
    stepId: step.id,
    userId: userProfile.id,
    trigger: result.trigger,
    lastVisitedCount: result.lastVisited.length,
  });
};
