// THE FRAME'S REMEMBERED GEOMETRY — cookies, so the server paints the first frame right
// (ROLLOUT-PLAN Attack #4). Plain module: no "use client", no next/headers, no app imports, so
// the frame writes it, a host's server reader (`frame-host/frameGeometry.server.ts`) reads it,
// and the move into @ai-matrx/shell stays a copy. Same convention as the live dock's
// `side-panel:<id>:width` cookies (one year, path=/, lax).
//
//   matrx-frame:sidebar-width           the product sidebar's width (px)
//   matrx-frame:side-chat-width         the side chat's width (px)
//   matrx-frame:side-chat-open          the person's open/closed choice PER PAGE KEY, one cookie holding
//                                       the most recent FRAME_COMPANION_OPEN_KEEP pages (a cookie per page
//                                       would grow the request header without bound)

export const FRAME_GEOMETRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const FRAME_SIDEBAR_WIDTH_COOKIE = "matrx-frame:sidebar-width";
export const FRAME_COMPANION_WIDTH_COOKIE = "matrx-frame:side-chat-width";
export const FRAME_COMPANION_OPEN_COOKIE = "matrx-frame:side-chat-open";
/** How many pages' side chat choices the one cookie keeps (most recent first). */
export const FRAME_COMPANION_OPEN_KEEP = 30;
/** The encoded cookie value stays under this (a browser drops a whole cookie past ~4 KB; keys are unbounded). */
export const FRAME_COMPANION_OPEN_MAX_BYTES = 1500;

type OpenEntry = [pageKey: string, open: 0 | 1];

function parseOpenEntries(value: string | undefined | null): OpenEntry[] {
  if (!value) return [];
  try {
    // A reader that hands the raw header value (not every cookie API decodes) gets it decoded here.
    const parsed: unknown = JSON.parse(value.startsWith("%") ? decodeURIComponent(value) : value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is OpenEntry => Array.isArray(e) && typeof e[0] === "string" && (e[1] === 0 || e[1] === 1),
    );
  } catch {
    // An unreadable cookie is the same as no choice anywhere: closed by default.
    return [];
  }
}

/** This page's remembered side chat choice: true / false, or null when never chosen here. */
export function frameCompanionOpenFor(value: string | undefined | null, pageKey: string): boolean | null {
  const hit = parseOpenEntries(value).find((e) => e[0] === pageKey);
  return hit ? hit[1] === 1 : null;
}

/** The cookie's next value after the person chose `open` on `pageKey` (that page moves to the front). */
export function nextFrameCompanionOpen(value: string | undefined | null, pageKey: string, open: boolean): string {
  // Closed is the default, so only OPEN pages are stored; choosing closed just forgets the page.
  const rest = parseOpenEntries(value).filter((e) => e[0] !== pageKey && e[1] === 1);
  const entries: OpenEntry[] = (open ? [[pageKey, 1] as OpenEntry, ...rest] : rest).slice(0, FRAME_COMPANION_OPEN_KEEP);
  // Trim the oldest until the ENCODED value fits (what the browser counts against the cookie cap).
  while (entries.length > 0 && encodeURIComponent(JSON.stringify(entries)).length > FRAME_COMPANION_OPEN_MAX_BYTES) {
    entries.pop();
  }
  return JSON.stringify(entries);
}

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
  /** The person's remembered choice for THIS page key; null = never chosen (closed by default). */
  companionOpen?: boolean | null;
}

/** What a cookie header says, for the frame's `pageKey` — the host's server reader calls this. */
export function frameGeometryFromCookies(
  read: (name: string) => string | undefined,
  pageKey: string | undefined,
): FrameInitialGeometry {
  return {
    sidebarWidth: parseFrameWidth(read(FRAME_SIDEBAR_WIDTH_COOKIE)),
    companionWidth: parseFrameWidth(read(FRAME_COMPANION_WIDTH_COOKIE)),
    companionOpen: pageKey ? frameCompanionOpenFor(read(FRAME_COMPANION_OPEN_COOKIE), pageKey) : null,
  };
}
