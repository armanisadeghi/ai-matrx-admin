"use client";

/**
 * Global ⌘⇧T / Ctrl+Shift+T shortcut — thin client shell.
 *
 * Owns ONLY the keydown listener (active immediately, ~zero cost) and the
 * `open` boolean. The dialog body — Dialog + Input + Textarea + Button +
 * lucide + tasks slice + project selector — lives in
 * `GlobalTaskShortcutImpl.tsx` and is `next/dynamic`-loaded ONLY after the
 * first matching keypress, so its dep graph never enters the static graph
 * of any route.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GlobalTaskShortcutImpl = dynamic(
  () => import("./GlobalTaskShortcutImpl"),
  { ssr: false, loading: () => null },
);

export default function GlobalTaskShortcut() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;
  return <GlobalTaskShortcutImpl onClose={() => setOpen(false)} />;
}
