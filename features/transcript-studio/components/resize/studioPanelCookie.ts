/**
 * Cookie helpers for the studio columns resizable layout.
 *
 * Lives in its own module (no `'use client'`) so the server route can call
 * `decodeStudioLayoutCookie` while reading `cookies()` for SSR-correct first
 * paint of the resizable widths. The client wrapper that writes the cookie
 * lives in `StudioPanelGroup.tsx`.
 */

import type { Layout } from "react-resizable-panels";

export const STUDIO_COLUMN_COOKIE_NAME = "panels:studio-columns";
export const STUDIO_COLUMN_GROUP_ID = "studio-columns";

export const STUDIO_COLUMN_PANEL_IDS = {
  raw: "raw",
  cleaned: "cleaned",
  concepts: "concepts",
  module: "module",
} as const;

export const STUDIO_COLUMN_DEFAULT_LAYOUT: Layout = {
  raw: 35,
  cleaned: 35,
  concepts: 15,
  module: 15,
};

/**
 * Decode the layout cookie. Returns undefined when missing or malformed —
 * the Group then falls back to STUDIO_COLUMN_DEFAULT_LAYOUT.
 */
export function decodeStudioLayoutCookie(
  raw: string | undefined,
): Layout | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Layout;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}
