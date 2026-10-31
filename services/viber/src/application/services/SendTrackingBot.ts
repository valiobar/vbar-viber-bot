/**
 * Send-tracking wrapper around a viber-bot Bot.
 *
 * Records whether sendMessage was called so callers can tell a custom
 * handler that replied from one that stayed silent. Service-local: it
 * depends on viber-bot, so it does not belong in @vbar/shared.
 */

import { Bot } from "viber-bot";

export interface SendTrackingBot {
  bot: Bot;
  /** True once bot.sendMessage has been called on the proxy */
  wasSent: () => boolean;
}

export function createSendTrackingBot(bot: Bot): SendTrackingBot {
  let sent = false;
  const proxy = new Proxy(bot, {
    get(target, prop, receiver) {
      if (prop === "sendMessage") {
        return (...args: Parameters<Bot["sendMessage"]>) => {
          sent = true;
          return target.sendMessage(...args);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { bot: proxy, wasSent: () => sent };
}
