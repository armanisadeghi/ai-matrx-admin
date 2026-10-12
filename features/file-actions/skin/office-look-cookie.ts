/**
 * The Office look, mirrored into a cookie so the SERVER knows it at first paint (the homes and
 * editors draw the right look in the very first frame — no skeleton waiting on saved preferences,
 * no wrong-look flash). The synced preference stays the setting; this cookie is only its memory
 * for the next request, keyed by the person (a second person on this browser reads nothing).
 *
 * Written by `officeLookCookieMiddleware` on every real change once the saved preferences are read.
 * Read by `OfficeLookSeed` (server layout) → `useOfficeLook`.
 */
import { resolveOfficeLook, type OfficeLook } from "./office-look";

export const OFFICE_LOOK_COOKIE = "matrx_office_look";

export function encodeOfficeLookCookie(userId: string, look: OfficeLook): string {
  return `${userId}:${look}`;
}

/** The look stored for THIS person, or null (absent, malformed, or someone else's). */
export function decodeOfficeLookCookie(raw: string | null | undefined, userId: string | null | undefined): OfficeLook | null {
  if (!raw || !userId) return null;
  const at = raw.lastIndexOf(":");
  if (at < 0 || raw.slice(0, at) !== userId) return null;
  const value = raw.slice(at + 1);
  return value === "google" || value === "microsoft" ? resolveOfficeLook(value) : null;
}
