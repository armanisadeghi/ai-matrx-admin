/**
 * Draft-mode write helper for the brand-scoped Identity rooms that edit
 * `web.brand.profile` keys in page state (Messaging, Claims). Validation is
 * the parent's own: `mergeBrandProfileWrite` (unknown keys throw, malformed
 * shapes throw, empty clears). The result is the normalized profile the page
 * editor then stages — nothing is saved here; the person presses Save.
 */

import { mergeBrandProfileWrite } from "@/features/marketing/lib/brand-write-targets";
import {
  HASHTAG_USES,
  parseBrandProfile,
  type BrandProfile,
} from "@/features/marketing/types";
import type { Json } from "@/types/database.types";

/**
 * Validate `patch` against the room target's own key allowlist, then return the
 * normalized profile after merging it over `current`. Throws on bad input.
 */
export function normalizeRoomProfilePatch(
  target: string,
  allowedKeys: readonly string[],
  current: Json | null | undefined,
  patch: unknown,
): BrandProfile {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error(`${target} expects an object value.`);
  }
  const unknown = Object.keys(patch).filter((k) => !allowedKeys.includes(k));
  if (unknown.length > 0) {
    throw new Error(
      `${target}: unknown field(s) ${unknown.join(", ")}. Allowed: ${allowedKeys.join(", ")}.`,
    );
  }
  assertStrictListShapes(target, patch as Record<string, unknown>);
  try {
    return parseBrandProfile(mergeBrandProfileWrite(current, patch) as Json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message.replace(/^brand_profile/, target));
  }
}

/** A list-of-strings target value: must be a string array (empty clears). */
export function asStringList(target: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(
      `${target} takes the FULL list as an array of strings (empty array clears).`,
    );
  }
  return value as string[];
}

/**
 * `parseBrandProfile` NORMALIZES (a bad hashtag `use` becomes "branded", an
 * unknown pillar key is dropped). That is right for reading a stored profile
 * and wrong for an agent's write: a malformed value must fail loudly, never
 * be quietly reshaped into something the agent did not send.
 */
function assertStrictListShapes(target: string, patch: Record<string, unknown>): void {
  const fail = (why: string): never => {
    throw new Error(`${target}: ${why}`);
  };
  const objectRows = (key: string, value: unknown, fields: Record<string, "string" | "string?" | "string[]">) => {
    if (!Array.isArray(value)) fail(`${key} must be an array (empty array clears).`);
    (value as unknown[]).forEach((row, i) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) fail(`${key}[${i}] must be an object.`);
      const record = row as Record<string, unknown>;
      const extra = Object.keys(record).filter((k) => !(k in fields));
      if (extra.length) fail(`${key}[${i}] has unknown field(s) ${extra.join(", ")}.`);
      for (const [field, kind] of Object.entries(fields)) {
        const v = record[field];
        if (kind === "string" && (typeof v !== "string" || !v.trim())) fail(`${key}[${i}].${field} must be a non-empty string.`);
        if (kind === "string?" && v !== undefined && typeof v !== "string") fail(`${key}[${i}].${field} must be a string.`);
        if (kind === "string[]" && (!Array.isArray(v) || v.some((x) => typeof x !== "string"))) fail(`${key}[${i}].${field} must be an array of strings.`);
      }
    });
  };
  if ("hashtags" in patch) {
    objectRows("hashtags", patch.hashtags, { tag: "string", use: "string" });
    (patch.hashtags as Array<{ use: string }>).forEach((row, i) => {
      if (!(HASHTAG_USES as readonly string[]).includes(row.use)) {
        fail(`hashtags[${i}].use must be one of ${HASHTAG_USES.join(", ")}.`);
      }
    });
  }
  if ("messaging_pillars" in patch) {
    objectRows("messaging_pillars", patch.messaging_pillars, { title: "string", proof_points: "string[]" });
  }
  if ("content_pillars" in patch) {
    objectRows("content_pillars", patch.content_pillars, { name: "string", description: "string?" });
  }
  if ("elevator_pitches" in patch) {
    const v = patch.elevator_pitches;
    if (!v || typeof v !== "object" || Array.isArray(v)) fail("elevator_pitches must be an object.");
    for (const [k, text] of Object.entries(v as Record<string, unknown>)) {
      if (!["ten_second", "thirty_second", "sixty_second"].includes(k)) fail(`elevator_pitches has unknown field ${k}.`);
      if (typeof text !== "string") fail(`elevator_pitches.${k} must be a string.`);
    }
  }
}
