"use client";

/**
 * How many of a row's `[data-fit-item]` children fit before Google's "⋮ more"
 * takes the rest. Widths are measured once per item and remembered (a hidden
 * item keeps its last width), so shrinking and growing the window both settle
 * in one layout pass, before paint. Children without `data-fit-item` (the
 * Menus box, the File menu) are fixed and always count against the room.
 */

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Room kept for the "⋮" button itself. */
export const MORE_BUTTON_WIDTH = 32;

export function fitCount(
  itemWidths: number[],
  fixedWidth: number,
  available: number,
  gap: number,
): number {
  const total = fixedWidth + itemWidths.reduce((n, w) => n + w + gap, 0);
  if (total <= available) return itemWidths.length;
  const room = available - MORE_BUTTON_WIDTH - gap;
  let used = fixedWidth;
  let n = 0;
  for (const w of itemWidths) {
    if (used + w + gap > room) break;
    used += w + gap;
    n += 1;
  }
  return n;
}

export function useFitCount(rowRef: RefObject<HTMLElement | null>, total: number): number {
  const [count, setCount] = useState(total);
  const widths = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const style = getComputedStyle(row);
      const gap = parseFloat(style.columnGap) || 0;
      const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const kids = Array.from(row.children) as HTMLElement[];
      let fixed = 0;
      const keys: string[] = [];
      for (const el of kids) {
        const key = el.dataset.fitItem;
        if (key !== undefined) {
          keys.push(key);
          const w = el.getBoundingClientRect().width;
          if (w > 0) widths.current.set(key, w);
        } else if (el.dataset.fitMore === undefined) {
          fixed += el.getBoundingClientRect().width + gap;
        }
      }
      const list = keys.map((k) => widths.current.get(k) ?? 0);
      const next = fitCount(list, fixed, row.clientWidth - pad, gap);
      setCount((cur) => (cur === next ? cur : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [rowRef, total]);

  return Math.min(count, total);
}
