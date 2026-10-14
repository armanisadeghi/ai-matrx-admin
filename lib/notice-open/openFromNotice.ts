/**
 * lib/notice-open/openFromNotice.ts — THE door for every link a notification opens.
 *
 * 🚨 A NOTIFICATION NEVER MOVES THE PAGE THE PERSON IS ON (Arman, 2026-09-30,
 * widened 2026-10-14 after an Assist's "Open page" replaced the tab). Assists,
 * the admin attention dock, the bell / inbox, toasts, announcements and every
 * notifier like them open a window over the page or a NEW TAB — never
 * `router.push` / `router.replace`, never `location.assign` / `location.href =`,
 * never a same-tab `<Link>`.
 *
 * Three layers hold it:
 *   1. this door — programmatic opens call `openFromNotice(href)`;
 *   2. `NoticeSurfaceGuard` — any same-tab `<a>` clicked inside a surface
 *      marked `data-matrx-notice-surface` (or the toast stack) opens a new tab instead;
 *   3. `pnpm check:notice-new-tab` — refuses a same-tab navigation in notice code
 *      and in any toast `action` (CI + release gates).
 */

import { openOutbound } from "@ai-matrx/kit/outbound";
import { siteConfig } from "@/config/extras/site";
import { resolveRouteOrigin } from "./route-origin";

/** Mark a notification surface: `<div {...NOTICE_SURFACE}>`. The guard and the static check read it. */
export const NOTICE_SURFACE_ATTR = "data-matrx-notice-surface";
export const NOTICE_SURFACE = { [NOTICE_SURFACE_ATTR]: "" } as const;

/** Every element whose same-tab links the guard turns into new tabs. */
export const NOTICE_SURFACE_SELECTOR = `[${NOTICE_SURFACE_ATTR}], [data-sonner-toaster]`;

function isWebOrInternal(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return true;
  return /^https?:\/\//i.test(href);
}

/**
 * The absolute URL a notice link opens at: an internal route is resolved to the
 * origin whose build owns it (main / manage / demos), so the new tab never
 * lands on a host that 404s the route.
 */
export function noticeTabHref(href: string): string {
  if (typeof window === "undefined" || !isWebOrInternal(href)) return href;
  const target = resolveRouteOrigin(href, {
    profile: process.env.NEXT_PUBLIC_MATRX_PROFILE || "full",
    currentOrigin: window.location.origin,
    mainOrigin: siteConfig.url,
    adminOrigin: process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.trim() || "https://manage.aimatrx.com",
    demosOrigin: process.env.NEXT_PUBLIC_DEMOS_ORIGIN?.trim() || "https://demos.aimatrx.com",
  });
  return new URL(target.href, window.location.origin).toString();
}

/**
 * Open `href` from a notification: always a new tab, never this page.
 * `javascript:`, `data:` and other non-web schemes open nothing.
 */
export function openFromNotice(href: string | null | undefined): void {
  if (!href || typeof window === "undefined") return;
  if (!isWebOrInternal(href)) {
    console.warn(`[notice-open] Refused to open a non-web link from a notification: ${href}`);
    return;
  }
  openOutbound(noticeTabHref(href), "_blank", "noopener");
}

/** Spread on an `<a>` / `<Link>` / `<AppLink>` inside a notification. */
export function noticeLinkProps(href: string): { href: string; target: "_blank"; rel: "noopener" } {
  return { href, target: "_blank", rel: "noopener" };
}
