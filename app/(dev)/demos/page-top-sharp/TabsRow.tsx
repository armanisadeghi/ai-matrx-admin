"use client";

// The page-top bake-off (ui-sharp): THE TABS ROW.
// Reference: GitHub's repository tabs + Vercel's project tabs. Underline tabs with a count,
// flush to the page gutter. Desktop: the row sticks to the top of the page's scroll, and once the
// intro band has scrolled away the page's primary act slides in at its end (Vercel keeps "Visit"
// in reach the same way), so the one thing you came to do never scrolls off. Phone: the row
// scrolls sideways under the finger, the chosen tab is always scrolled into view, the edge fades
// say "more this way" (the design system's scroll mask), and it does not stick — the phone keeps
// its height for the page.
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { PANEL_MOTION_CLASS, useScrollMaskFade } from "@ai-matrx/design-system";
import { Tabs } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";

export interface TabsRowItem<T extends string> {
  value: T;
  label: string;
  count?: number | null;
}

export interface TabsRowProps<T extends string> {
  phone: boolean;
  value: T;
  onValueChange: (value: T) => void;
  items: readonly TabsRowItem<T>[];
  label: string;
  /** The page's primary act, shown at the row's end while the intro band is out of view (desktop). */
  end?: ReactNode;
  showEnd?: boolean;
}

export function TabsRow<T extends string>({ phone, value, onValueChange, items, label, end, showEnd }: TabsRowProps<T>) {
  const { ref, style } = useScrollMaskFade<HTMLDivElement>("horizontal", 24);
  const first = useRef(true);

  // Keep the chosen tab in view where the row scrolls sideways (a phone, a narrow window).
  useEffect(() => {
    const chosen = ref.current?.querySelector<HTMLElement>('[aria-selected="true"], [data-state="active"]');
    chosen?.scrollIntoView({ block: "nearest", inline: "center", behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [value, ref]);

  const endShown = !phone && Boolean(end) && showEnd;

  return (
    <div
      data-page-top="tabs"
      className={cn(
        "z-10 flex h-10 shrink-0 items-end gap-2 border-b border-border bg-card",
        !phone && "sticky top-0",
        phone ? "px-1" : "px-4",
      )}
    >
      <div ref={ref} style={style} className="scrollbar-hide min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
        <div className="w-max">
          <Tabs
            aria-label={label}
            rule={false}
            value={value}
            onValueChange={onValueChange}
            data={items.map((t) => ({ value: t.value, label: t.label, count: t.count ?? undefined }))}
          />
        </div>
      </div>
      {end ? (
        <div
          aria-hidden={!endShown}
          inert={!endShown}
          className={cn(
            "flex h-full shrink-0 items-center overflow-hidden transition-[max-width,opacity]",
            PANEL_MOTION_CLASS,
            endShown ? "max-w-60 opacity-100" : "max-w-0 opacity-0",
          )}
        >
          {end}
        </div>
      ) : null}
    </div>
  );
}
