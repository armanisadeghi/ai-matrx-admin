/**
 * Draft-mode write helper for the brand-scoped Identity rooms that edit
 * `web.brand.profile` keys in page state (Messaging, Claims). Validation is
 * the parent's own: `mergeBrandProfileWrite` (unknown keys throw, malformed
 * shapes throw, empty clears). The result is the normalized profile the page
 * editor then stages — nothing is saved here; the person presses Save.
 */

import { mergeBrandProfileWrite } from "@/features/marketing/lib/brand-write-targets";
import {
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
