/**
 * saveLastVisited custom response handler
 *
 * When a step has `responseHandler: "saveLastVisited"`, a JSON button tap
 * carries lastTitle, lastImage, and lastTrigger only for this tap. This
 * handler prepends { title, image, trigger } onto state.lastVisited and
 * returns { state, trigger }.
 *
 * Returning that result is required. A bare return or "continue" would let
 * the normal button flow merge the payload and persist those three temp keys.
 * MessageHandler applies this state (null removes a key) and opens `trigger`,
 * then stops, so the temps never land on the user.
 *
 * Typed replies and plain buttons fall through unchanged. A tap missing any
 * visit field also falls through so the normal button flow can run.
 */
import { CustomResponseAction, CustomResponseHandler } from "../types";
import { buildLastVisited } from "../../services/lastVisitedState";

const TEMP_KEYS = ["trigger", "lastTitle", "lastImage", "lastTrigger"] as const;

export const saveLastVisitedResponseHandler: CustomResponseHandler = async (ctx) => {
  const payload = ctx.button?.payload;
  if (!payload) {
    return;
  }

  const title: unknown = payload.lastTitle;
  const image: unknown = payload.lastImage;
  const visitTrigger: unknown = payload.lastTrigger;
  const navTrigger = typeof payload.trigger === "string" ? payload.trigger.trim() : "";

  const user = await ctx.userRepository.findByViberId(ctx.userProfile.id);
  if (!user) {
    ctx.logger.warn("saveLastVisited: user not found, skipping", {
      stepId: ctx.step.id,
      userId: ctx.userProfile.id,
    });
    return;
  }

  const built = buildLastVisited(user.state, {
    title,
    image,
    trigger: visitTrigger,
  });
  if (!built.saved) {
    ctx.logger.info("saveLastVisited: missing visit fields, falling through", {
      stepId: ctx.step.id,
      userId: ctx.userProfile.id,
      hasTitle: Boolean(built.title),
      hasImage: Boolean(built.image),
      hasTrigger: Boolean(built.trigger),
    });
    return;
  }

  const rest: Record<string, unknown> = { ...payload };
  for (const key of TEMP_KEYS) {
    delete rest[key];
  }

  const action: CustomResponseAction = {
    state: {
      ...rest,
      lastVisited: built.lastVisited,
      lastTitle: null,
      lastImage: null,
      lastTrigger: null,
    },
    ...(navTrigger ? { trigger: navTrigger } : {}),
  };

  ctx.logger.info("saveLastVisited prepared visit", {
    stepId: ctx.step.id,
    userId: ctx.userProfile.id,
    trigger: built.trigger,
    navTrigger: navTrigger || null,
    lastVisitedCount: built.lastVisited.length,
  });

  return action;
};
