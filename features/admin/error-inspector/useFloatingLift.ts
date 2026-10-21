"use client";

/**
 * THE BADGE MOVES, NEVER THE PAGE (Arman, 2026-10-20).
 *
 * The Error Inspector badge rests in the page's bottom-left corner. When a control is under it —
 * the Agent Studio composer, a list's pager, the attention dock — it rises to the nearest free spot
 * above (the assists control's own rule, `floatingLiftFor`). Until 2026-10-20 it published its
 * height instead and pages padded themselves by it, so the composer jumped up whenever an error was
 * captured. Guard: pnpm check:overlays-never-move-page.
 *
 * A callback ref, because the badge renders as a pill, a dot or nothing. The lift is written to the
 * badge's own style, never the page. Cannot loop: the page never reads it.
 */
import { useEffect, useState } from "react";

import { floatingLiftFor } from "@/features/assists/assistClearance";

/** Quiet-period backstop for moves no event names (a composer growing, a pager appearing). */
const BACKSTOP_MS = 1000;

export function useFloatingLift<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [element, setElement] = useState<T | null>(null);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (!element) return undefined;
    let current = 0;
    // A timer, not requestAnimationFrame: rAF never fires in a hidden tab (FloatingClearanceSync).
    let timer: ReturnType<typeof setTimeout> | null = null;
    const place = () => {
      timer = null;
      // Within the lower half of the screen only: on a list every row has a checkbox, and a badge
      // that flew to the top of the page read as a different thing. No free spot → it rests.
      const next = floatingLiftFor(element, current, window.innerHeight / 2) ?? 0;
      if (next !== current) {
        current = next;
        setLift(next);
      }
    };
    const schedule = () => {
      if (timer === null) timer = setTimeout(place, 16);
    };
    schedule();
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    // Every second whatever the tab's visibility: the place must be right the moment it is shown,
    // and a browser already throttles a hidden tab's timers. One pass is a few rects.
    const backstop = setInterval(schedule, BACKSTOP_MS);
    return () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      clearInterval(backstop);
      setLift(0);
    };
  }, [element]);

  return [setElement, lift];
}
