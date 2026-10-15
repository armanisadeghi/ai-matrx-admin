"use client";

/**
 * The homes' sticky "Recent …" header row (Google Docs / Sheets): it sticks under the app header
 * while the list scrolls, wears Google's lift shadow only once it is stuck, and — in the Google
 * list — names the time group currently under it ("Previous 30 days"), as Google's does.
 *
 * Nothing here changes layout: the shadow and the title text are the only things that move. One
 * passive scroll listener on the home's scroller, measured once per frame.
 */

import { useEffect, useRef, useState } from "react";

/** `layout` names what is on screen (look, view, loading): the listener re-attaches when it changes. */
export function useStickyHomeHeader(groupKeys: readonly string[], layout: string) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const groupEls = useRef(new Map<string, HTMLElement>());
  const [stuck, setStuck] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const keys = groupKeys.join("\u0000");

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const bar = barRef.current;
    const scroller = sentinel?.closest<HTMLElement>("[data-file-home]");
    if (!sentinel || !bar || !scroller) return;
    const order = keys ? keys.split("\u0000") : [];
    let frame = 0;
    const measure = () => {
      frame = 0;
      const barBox = bar.getBoundingClientRect();
      // The sentinel sits right above the bar; once the bar holds still and the sentinel keeps
      // going up, the bar is stuck.
      setStuck(sentinel.getBoundingClientRect().top < barBox.top - 0.5);
      let current: string | null = order[0] ?? null;
      for (const key of order) {
        const el = groupEls.current.get(key);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= barBox.bottom + 1) current = key;
        else break;
      }
      setCurrentGroup(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [keys, layout]);

  const groupRef = (key: string, el: HTMLElement | null) => {
    if (el) groupEls.current.set(key, el);
    else groupEls.current.delete(key);
  };

  return { sentinelRef, barRef, stuck, currentGroup, groupRef };
}
