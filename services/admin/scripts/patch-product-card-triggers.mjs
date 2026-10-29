/**
 * Rewrite product-card reply triggers to JSON action bodies.
 *
 * For every carousel card whose second button has a BgMedia in the product
 * image list below, the second button's reply becomes:
 *
 *   {
 *     "trigger": "<current trigger>",
 *     "lastTitle": "<first button Text>",
 *     "lastImage": "<second button BgMedia>",
 *     "lastTrigger": "<current trigger>"
 *   }
 *
 * `isJson` is set true. The same change is written on the card (source of
 * truth) and on the flattened `Buttons` array the bot sends.
 *
 * Dry-run by default. Pass --apply to write.
 *
 *   node services/admin/scripts/patch-product-card-triggers.mjs
 *   node services/admin/scripts/patch-product-card-triggers.mjs --apply
 *
 * Uses MONGODB_URI and MONGODB_DB_NAME (default admin_service) from the
 * environment or the repo-root .env. After --apply, restart the viber
 * service or refresh carousels so the bot drops its in-memory copy.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const PRODUCT_IMAGES = new Set([
  "https://cdn.kvaba.xyz/bodrost/products/eyes.png",
  "https://cdn.kvaba.xyz/bodrost/products/balance_ch_fl.png",
  "https://cdn.kvaba.xyz/bodrost/products/sin_biothik.png",
  "https://cdn.kvaba.xyz/bodrost/products/mussels.png",
  "https://cdn.kvaba.xyz/bodrost/products/tonus.png",
  "https://cdn.kvaba.xyz/bodrost/products/lever.png",
  "https://cdn.kvaba.xyz/bodrost/products/brain_heart.png",
  "https://cdn.kvaba.xyz/bodrost/products/no-stress.png",
  "https://cdn.kvaba.xyz/bodrost/products/good-mood.png",
  "https://cdn.kvaba.xyz/bodrost/products/emotion_bal.png",
  "https://cdn.kvaba.xyz/bodrost/products/bones.png",
  "https://cdn.kvaba.xyz/bodrost/products/meno.png",
  "https://cdn.kvaba.xyz/bodrost/products/stavi.png",
  "https://cdn.kvaba.xyz/bodrost/products/memory.png",
  "https://cdn.kvaba.xyz/bodrost/products/sharp_brain.png",
  "https://cdn.kvaba.xyz/bodrost/products/hair_skin.png",
  "https://cdn.kvaba.xyz/bodrost/products/immune_sys.png",
  "https://cdn.kvaba.xyz/bodrost/products/energy_def.png",
  "https://cdn.kvaba.xyz/bodrost/products/strong_immu.png",
  "https://cdn.kvaba.xyz/bodrost/products/nerv_system_con.png",
]);

const apply = process.argv.includes("--apply");

const loadEnv = () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(scriptDir, "../../../.env"),
    path.resolve(scriptDir, "../../.env"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return candidate;
    }
  }
  return null;
};

const resolveMongoUri = () => {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error(
      "MONGODB_URI is required. Export it or add it to the repo-root .env."
    );
  }
  if (rawUri.includes("authSource=")) return rawUri;
  const separator = rawUri.includes("?") ? "&" : "?";
  return `${rawUri}${separator}authSource=admin`;
};

const bgUrl = (button) =>
  typeof button?.BgMedia === "string" ? button.BgMedia.trim() : "";

const isTargetImage = (button) => PRODUCT_IMAGES.has(bgUrl(button));

/** Plain reply text, or the trigger field when the body is already JSON. */
const readTrigger = (actionBody) => {
  const raw = typeof actionBody === "string" ? actionBody : "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof parsed.trigger === "string"
    ) {
      return parsed.trigger;
    }
  } catch {
    // Plain trigger string.
  }
  return raw;
};

const buildActionBody = (trigger, lastTitle, lastImage) =>
  JSON.stringify({
    trigger,
    lastTitle,
    lastImage,
    lastTrigger: trigger,
  });

/**
 * @returns {{ status: "patched" | "unchanged" | "skipped", reason?: string, previous?: string, next?: string, trigger?: string }}
 */
const patchButton = (button, lastTitle) => {
  if (!button) return { status: "skipped", reason: "missing second button" };
  if (button.ActionType !== "reply") {
    return {
      status: "skipped",
      reason: `ActionType is ${button.ActionType || "empty"}, not reply`,
    };
  }
  const trigger = readTrigger(button.ActionBody);
  const next = buildActionBody(trigger, lastTitle ?? "", bgUrl(button));
  if (button.isJson === true && button.ActionBody === next) {
    return { status: "unchanged", trigger, next };
  }
  const previous = button.ActionBody;
  button.ActionBody = next;
  button.isJson = true;
  return { status: "patched", previous, next, trigger };
};

/** How many flattened buttons belong to a structured card starting at `start`. */
const structuredSliceLength = (buttons, start, groupRows) => {
  const target = groupRows > 0 ? groupRows : 7;
  let rows = 0;
  let count = 0;
  while (start + count < buttons.length && rows < target) {
    const row = Number(buttons[start + count]?.Rows) || 1;
    if (count > 0 && rows + row > target) break;
    rows += row;
    count += 1;
  }
  return count;
};

const shorten = (value, max = 180) => {
  const text = value == null ? "" : String(value).replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const envFile = loadEnv();
const dbName = process.env.MONGODB_DB_NAME || "admin_service";

console.log(apply ? "APPLY — writing matching cards" : "DRY RUN — no writes");
if (envFile) console.log(`env: ${envFile}`);
console.log(`database: ${dbName}`);

await mongoose.connect(resolveMongoUri(), { dbName, bufferCommands: false });

try {
  const collection = mongoose.connection.collection("carousels");
  const carousels = await collection.find({}).toArray();

  let scannedCards = 0;
  let matched = 0;
  let patched = 0;
  let unchanged = 0;
  let skipped = 0;
  let carouselsToWrite = 0;

  for (const carousel of carousels) {
    const cards = Array.isArray(carousel.Cards) ? carousel.Cards : [];
    const flat = Array.isArray(carousel.Buttons) ? carousel.Buttons : [];
    const groupRows = Number(carousel.ButtonsGroupRows) || 7;
    let offset = 0;
    let carouselChanged = false;
    const name = carousel.humanReadableName || String(carousel._id);

    for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
      const card = cards[cardIndex];
      const custom =
        card?.mode === "custom" ||
        (card?.mode !== "structured" &&
          Array.isArray(card?.Buttons) &&
          card.Buttons.length > 0);
      const sliceLength = custom
        ? (card.Buttons || []).length
        : structuredSliceLength(flat, offset, groupRows);

      scannedCards += 1;

      if (custom && isTargetImage(card.Buttons?.[1])) {
        matched += 1;
        const firstText = card.Buttons[0]?.Text ?? "";
        const result = patchButton(card.Buttons[1], firstText);
        const label = `${name} / card ${cardIndex + 1} / ${bgUrl(card.Buttons[1])}`;

        const flatButton = flat[offset + 1];
        const flatAligned =
          flatButton && bgUrl(flatButton) === bgUrl(card.Buttons[1]);
        const flatResult =
          flatAligned && result.status !== "skipped"
            ? patchButton(flatButton, firstText)
            : null;

        if (result.status === "patched" || flatResult?.status === "patched") {
          patched += 1;
          carouselChanged = true;
          if (!flatAligned) {
            console.warn(`  flattened button not aligned, card copy only: ${label}`);
          }
          const shown = result.status === "patched" ? result : flatResult;
          console.log(`PATCH ${label}`);
          console.log(`  trigger: ${shorten(shown.trigger)}`);
          console.log(`  lastTitle: ${shorten(firstText)}`);
          console.log(`  before: ${shorten(shown.previous)}`);
          console.log(`  after:  ${shown.next}`);
        } else if (result.status === "unchanged") {
          unchanged += 1;
          console.log(`UNCHANGED ${label}`);
        } else {
          skipped += 1;
          console.log(`SKIP ${label} — ${result.reason}`);
        }
      }

      offset += sliceLength;
    }

    if (carouselChanged) {
      carouselsToWrite += 1;
      if (apply) {
        await collection.updateOne(
          { _id: carousel._id },
          {
            $set: {
              Cards: carousel.Cards,
              Buttons: carousel.Buttons,
              updatedAt: new Date(),
            },
          }
        );
      }
    }
  }

  console.log("");
  console.log(`carousels scanned: ${carousels.length}`);
  console.log(`cards scanned: ${scannedCards}`);
  console.log(`second buttons on a listed image: ${matched}`);
  console.log(`patched: ${patched}`);
  console.log(`already in the new shape: ${unchanged}`);
  console.log(`skipped: ${skipped}`);
  console.log(
    apply
      ? `wrote ${carouselsToWrite} carousel(s). Restart viber or refresh carousels so the bot reloads them.`
      : `would write ${carouselsToWrite} carousel(s). Re-run with --apply to save.`
  );
} finally {
  await mongoose.disconnect();
}
