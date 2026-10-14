"use client";

/**
 * NoticeSurfaceGuard — the runtime net under `openFromNotice` (see that file).
 *
 * One capture-phase click listener on the document. A plain click on an
 * `<a href>` that would open in THIS tab, inside a notification surface
 * (`data-matrx-notice-surface` or the toast stack), is cancelled and opened in
 * a new tab instead — whatever rendered the link (`Link`, `AppLink`, markdown,
 * an entity chip). `preventDefault` only: the link's own onClick still runs
 * (dismiss, mark-read), and Next's `<Link>` skips navigation when the event
 * is already default-prevented.
 */

import { useEffect } from "react";
import { NOTICE_SURFACE_SELECTOR, openFromNotice } from "./openFromNotice";

export function interceptNoticeLinkClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  // A modified click is already the browser's own new-tab/new-window gesture.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const start = event.target;
  if (!(start instanceof Element)) return false;
  const anchor = start.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (!anchor.closest(NOTICE_SURFACE_SELECTOR)) return false;
  if (anchor.hasAttribute("download")) return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self" && target !== "_top" && target !== "_parent") return false;
  const href = anchor.getAttribute("href") ?? "";
  // In-page anchors and mail/tel links never leave the page.
  if (href.startsWith("#") || /^(mailto|tel|sms):/i.test(href)) return false;
  event.preventDefault();
  openFromNotice(href);
  return true;
}

export default function NoticeSurfaceGuard() {
  useEffect(() => {
    document.addEventListener("click", interceptNoticeLinkClick, true);
    return () => document.removeEventListener("click", interceptNoticeLinkClick, true);
  }, []);
  return null;
}
