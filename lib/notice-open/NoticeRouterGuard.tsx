"use client";

/**
 * NoticeRouterGuard — the router half of "a notification never moves the page".
 *
 * Re-provides Next's app router to the whole tree with `push` / `replace`
 * wrapped: while a notification is acting (`noticeActivation.ts` — a toast
 * action, a press inside a notice surface), a move to ANOTHER page opens that
 * page in a new tab and this page stays. Same-page moves (a query or hash
 * change) pass through. Everything else is Next's own router, untouched.
 */

import { useContext, type ReactNode } from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isNoticeActionActive } from "./noticeActivation";
import { openFromNotice } from "./openFromNotice";

function leavesThisPage(href: string): boolean {
  try {
    const next = new URL(href, window.location.href);
    return next.origin !== window.location.origin || next.pathname !== window.location.pathname;
  } catch {
    return true;
  }
}

export default function NoticeRouterGuard({ children }: { children: ReactNode }) {
  const router = useContext(AppRouterContext);
  if (!router) return <>{children}</>;
  const guarded: typeof router = {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => {
      if (isNoticeActionActive() && leavesThisPage(href)) {
        console.warn(`[notice-open] A notification asked to move this page to ${href}; opened a new tab instead.`);
        openFromNotice(href);
        return;
      }
      router.push(href, options);
    },
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
      if (isNoticeActionActive() && leavesThisPage(href)) {
        console.warn(`[notice-open] A notification asked to move this page to ${href}; opened a new tab instead.`);
        openFromNotice(href);
        return;
      }
      router.replace(href, options);
    },
  };
  return <AppRouterContext.Provider value={guarded}>{children}</AppRouterContext.Provider>;
}
