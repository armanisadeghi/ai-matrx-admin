// THE FRAME'S REMEMBERED GEOMETRY — cookies, so the server paints the first frame right
// (ROLLOUT-PLAN Attack #4). Plain module: no "use client", no next/headers, no app imports, so
// the frame writes it, a host's server reader (`frame-host/frameGeometry.server.ts`) reads it,
// and the move into @ai-matrx/shell stays a copy. Same convention as the live dock's
// `side-panel:<id>:width` cookies (one year, path=/, lax).
//
//   matrx-frame:sidebar-width           the product sidebar's width (px)
//   matrx-frame:side-chat-width         the side chat's width (px)
//
// The side chat's OPEN / CLOSED is not the frame's: it is the Side Chat's one rule and cookie (per
// home, `@ai-matrx/chat/canvas/workspace/side-chat-state`), shared with the classic dock.

export const FRAME_GEOMETRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const FRAME_SIDEBAR_WIDTH_COOKIE = "matrx-frame:sidebar-width";
export const FRAME_COMPANION_WIDTH_COOKIE = "matrx-frame:side-chat-width";
/** A stored width, or null when absent or unreadable (the caller clamps it to today's limits). */
export function parseFrameWidth(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The browser's value for one cookie (null on the server, or when absent). */
export function readFrameCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const hit = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.slice(prefix.length));
  } catch {
    // A corrupt cookie reads as absent (the page falls back to its default), never throws.
    return null;
  }
}

export function writeFrameCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${FRAME_GEOMETRY_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * What a host's server read hands the frame for its first paint. Every field optional: absent =
 * the frame reads the cookie after mount (a host with no server, e.g. the lab playground).
 */
export interface FrameInitialGeometry {
  sidebarWidth?: number | null;
  companionWidth?: number | null;
}

/** What a cookie header says — the host's server reader calls this. */
export function frameGeometryFromCookies(read: (name: string) => string | undefined): FrameInitialGeometry {
  return {
    sidebarWidth: parseFrameWidth(read(FRAME_SIDEBAR_WIDTH_COOKIE)),
    companionWidth: parseFrameWidth(read(FRAME_COMPANION_WIDTH_COOKIE)),
  };
}
