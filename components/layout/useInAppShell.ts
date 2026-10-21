"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** The app shell's root element — `AppShell`'s `.shell-root`, or the new app frame's host root (FrameShell). */
export const APP_SHELL_ROOT_SELECTOR = ".shell-root, [data-matrx-frame-host]";

/**
 * True when the current route renders inside the signed-in app shell
 * (`AppShell` → `.shell-root`), false on every route group that has none
 * (public, share links, meet, kiosk, portal, auth pages). Re-read after each
 * navigation commits, because the layout — and with it the shell — can change
 * on a client-side route change.
 */
export function useInAppShell(): boolean {
  const pathname = usePathname();
  const [inShell, setInShell] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the committed DOM, an external fact
    setInShell(document.querySelector(APP_SHELL_ROOT_SELECTOR) !== null);
  }, [pathname]);
  return inShell;
}
