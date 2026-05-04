"use client";

/**
 * Mobile column switcher — a tab strip + single-column body that replaces
 * the 4-column resizable shell on viewports below the mobile breakpoint.
 *
 * The 4-column shell is fundamentally a desktop affordance (every column
 * needs ~200px+ to be readable). On phones we render one column at a time
 * with a horizontally scrollable tab strip across the top. All four
 * column components keep mounting (they own their own subscriptions), so
 * realtime + autoscroll keep working in the background. Only the active
 * one is visible.
 *
 * Persisted via React state in `<ActiveSessionView>` — falling back to
 * "raw" on first mount keeps the most-important live column visible.
 */

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StudioMobileColumn = "raw" | "cleaned" | "concepts" | "module";

interface StudioColumnsMobileProps {
  raw: ReactNode;
  cleaned: ReactNode;
  concepts: ReactNode;
  module: ReactNode;
  /** Module label displayed in the rightmost tab. */
  moduleLabel: string;
  /** Optional default tab; "raw" if omitted. */
  defaultActive?: StudioMobileColumn;
}

const TAB_ORDER: StudioMobileColumn[] = [
  "raw",
  "cleaned",
  "concepts",
  "module",
];

export function StudioColumnsMobile({
  raw,
  cleaned,
  concepts,
  module: moduleNode,
  moduleLabel,
  defaultActive = "raw",
}: StudioColumnsMobileProps) {
  const [active, setActive] = useState<StudioMobileColumn>(defaultActive);

  const labels: Record<StudioMobileColumn, string> = {
    raw: "Raw",
    cleaned: "Cleaned",
    concepts: "Concepts",
    module: moduleLabel,
  };

  const panels: Record<StudioMobileColumn, ReactNode> = {
    raw,
    cleaned,
    concepts,
    module: moduleNode,
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 overflow-x-auto border-b border-border bg-background">
        <div role="tablist" className="flex min-w-full">
          {TAB_ORDER.map((id) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(id)}
                className={cn(
                  "flex-1 shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                  "border-b-2",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                {labels[id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep all four panels mounted so subscriptions / autoscroll stay
          alive in the background; only the active one is visible. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {TAB_ORDER.map((id) => (
          <div
            key={id}
            role="tabpanel"
            aria-hidden={id !== active}
            className={cn(
              "absolute inset-0 flex flex-col min-h-0",
              id === active ? "visible" : "invisible pointer-events-none",
            )}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
