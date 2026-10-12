/**
 * officeLookCookieMiddleware — MIRROR THE PERSON'S OFFICE LOOK INTO A COOKIE once their saved
 * preferences are read, so the next page request is server-rendered in that look (see
 * `features/file-actions/skin/office-look-cookie.ts`). A Redux write with a non-Redux consequence,
 * the same pattern as `activeOrgCookieMiddleware`. Writes only when the value differs from what
 * this tab last wrote or found, so it is not rewritten on every action.
 */
import type { Middleware } from "@reduxjs/toolkit";
import { resolveOfficeLook } from "@/features/file-actions/skin/office-look";
import { encodeOfficeLookCookie, OFFICE_LOOK_COOKIE } from "@/features/file-actions/skin/office-look-cookie";

interface Shape {
  userPreferences?: { display?: { officeLook?: unknown }; _meta?: { loadStatus?: string } };
  userAuth?: { id?: unknown };
}

let lastMirrored: string | null = null;

function currentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${OFFICE_LOOK_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(OFFICE_LOOK_COOKIE.length + 1)) : null;
}

export const officeLookCookieMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  if (typeof document === "undefined") return result;
  const state = storeApi.getState() as Shape;
  if (state.userPreferences?._meta?.loadStatus !== "loaded") return result;
  const userId = state.userAuth?.id;
  if (typeof userId !== "string" || !userId) return result;
  const value = encodeOfficeLookCookie(userId, resolveOfficeLook(state.userPreferences.display?.officeLook));
  if (value === lastMirrored) return result;
  lastMirrored = value;
  if (currentCookie() !== value) {
    document.cookie = `${OFFICE_LOOK_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  }
  return result;
};
