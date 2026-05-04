/**
 * Cookie helpers for the studio sidebar/main split. Server-readable
 * (no `'use client'`). Shape matches react-resizable-panels' `Layout`
 * (percentages 0..100 keyed by panel id).
 */

import type { Layout } from "react-resizable-panels";

export const STUDIO_SIDEBAR_COOKIE_NAME = "panels:studio-sidebar";
export const STUDIO_SIDEBAR_GROUP_ID = "studio-sidebar";

export const STUDIO_SIDEBAR_PANEL_IDS = {
  sidebar: "sidebar",
  main: "main",
} as const;

export const STUDIO_SIDEBAR_DEFAULT_LAYOUT: Layout = {
  sidebar: 18,
  main: 82,
};

export function decodeStudioSidebarCookie(
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
