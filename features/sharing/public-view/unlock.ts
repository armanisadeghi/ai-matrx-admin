// features/sharing/public-view/unlock.ts — THE SIGNED "I KNOW THE PASSWORD" COOKIE OF ONE PASSWORD-PROTECTED VIEW LINK.
//
// SERVER ONLY. The password is checked by the store (`custom.shared_view_read`); on success the store hands back `unlock`, a
// fingerprint of the stored password hash. The cookie carries that fingerprint, signed with the server's own secret so a
// visitor cannot make one, and the store compares it on every read. Changing the link's password changes the fingerprint,
// so every cookie made before it stops working. One cookie per link (the name carries the token's start), path-scoped to it.

import { createHmac, timingSafeEqual } from "node:crypto";

/** How long a visitor stays unlocked in one browser. */
export const UNLOCK_SECONDS = 12 * 60 * 60;

export function unlockCookieName(token: string): string {
  return `viewlink_${token.slice(0, 16)}`;
}

function sign(token: string, fingerprint: string): string {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set, so an unlock cookie cannot be signed or checked.");
  return createHmac("sha256", secret).update(`${token}.${fingerprint}`).digest("hex");
}

export function makeUnlockCookieValue(token: string, fingerprint: string): string {
  return `${fingerprint}.${sign(token, fingerprint)}`;
}

/** The fingerprint inside a cookie this server signed for THIS token, or undefined. */
export function readUnlockCookieValue(token: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [fingerprint, mac] = value.split(".");
  if (!fingerprint || !mac) return undefined;
  const expected = Buffer.from(sign(token, fingerprint), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? fingerprint : undefined;
}
