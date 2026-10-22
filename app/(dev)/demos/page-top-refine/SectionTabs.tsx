"use client";

// THE TABS ROW, modeled on GitHub's repository tabs (Primer UnderlineNav): underline tabs with a
// leading icon and a count; when the row runs out of room the tabs that do not fit move into ONE
// "More" menu at the row's end — never a sideways scroll that hides tabs, never a second line.
// The selected tab is never hidden: if it would overflow it takes the last visible place.
//
// Desktop: sticky at the top of the page's scroll area (it stays when the intro and summary bands
// scroll away) and gains a soft shadow once it is stuck. Phone: in flow, so the page keeps its
// height for content; the same overflow rule keeps every tab one tap away.
//
// Built on the package's underline `Tabs` (the row draws the hairline, so the selected underline
// lands on the row's rule). Arrow keys move between tabs and select (the WAI-ARIA tabs pattern).
import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import { Tabs } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";

export interface SectionTab {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** A count after the label; `null`/absent = none (never a fake 0). */
  count?: number | null;
}

export interface SectionTabsProps {
  items: readonly SectionTab[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  /** Sticky at the top of the scroll area (desktop). */
  sticky: boolean;
}

/** Room kept for the "More" trigger when anything overflows. */
const MORE_PX = 84;

function TabFace({ tab }: { tab: SectionTab }) {
  const Icon = tab.icon;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {Icon ? <Icon className="size-3.5 text-muted-foreground" aria-hidden /> : null}
      {tab.label}
    </span>
  );
}

export function SectionTabs({ items, value, onValueChange, sticky, "aria-label": ariaLabel }: SectionTabsProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(items.length);
  const [stuck, setStuck] = useState(false);

  // Measure every tab once in a hidden copy, then fit as many as the row holds.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const widths = [...measure.querySelectorAll<HTMLElement>("[role=tab]")].map((el) => el.getBoundingClientRect().width);
      const cs = getComputedStyle(row);
      const room = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= room) {
        setFit(widths.length);
        return;
      }
      let used = MORE_PX;
      let n = 0;
      for (const w of widths) {
        if (used + w > room) break;
        used += w;
        n++;
      }
      setFit(Math.max(1, n));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    return () => ro.disconnect();
  }, [items]);

  // Stuck = the sentinel just above the row has scrolled out of the scroll area.
  useLayoutEffect(() => {
    const el = sentinelRef.current;
    if (!sticky || !el) {
      setStuck(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [sticky]);

  const activeIndex = items.findIndex((t) => t.value === value);
  let visible = items.slice(0, fit);
  if (activeIndex >= fit && fit > 0) visible = [...items.slice(0, fit - 1), items[activeIndex]];
  const overflow = items.filter((t) => !visible.includes(t));

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    const at = visible.findIndex((t) => t.value === value);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? visible.length - 1 : (at + (e.key === "ArrowRight" ? 1 : -1) + visible.length) % visible.length;
    e.preventDefault();
    onValueChange(visible[next].value);
    requestAnimationFrame(() => rowRef.current?.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus());
  }

  const data = (list: readonly SectionTab[]) =>
    list.map((t) => ({ value: t.value, label: <TabFace tab={t} />, count: t.count ?? null, ariaLabel: t.label }));

  return (
    <>
      {sticky ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}
      <div
        ref={rowRef}
        data-page-top="tabs"
        data-stuck={stuck ? "" : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex h-10 shrink-0 items-end border-b border-border bg-card",
          sticky ? "px-6" : "px-4",
          sticky && "sticky top-0 z-10",
          stuck && "shadow-sm",
        )}
      >
        <Tabs variant="underline" rule={false} aria-label={ariaLabel} value={value} onValueChange={onValueChange} data={data(visible)} />
        {overflow.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${overflow.length} more tabs`}
                className="type-body mb-1.5 ml-1 flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                More
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" surface="solid" className="min-w-48">
              {overflow.map((t) => {
                const Icon = t.icon;
                return (
                  <DropdownMenuItem key={t.value} size="sm" onSelect={() => onValueChange(t.value)}>
                    {Icon ? <Icon aria-hidden /> : <Check aria-hidden className="invisible" />}
                    {t.label}
                    {t.count != null ? <DropdownMenuShortcut>{t.count}</DropdownMenuShortcut> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {/* The hidden measuring copy: every tab at its natural width. */}
        <div ref={measureRef} aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 flex">
          <Tabs variant="underline" rule={false} aria-label={`${ariaLabel} (measure)`} value={value} onValueChange={() => {}} data={data(items)} />
        </div>
      </div>
    </>
  );
}
