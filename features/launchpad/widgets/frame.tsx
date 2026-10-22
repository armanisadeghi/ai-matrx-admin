"use client";

// features/launchpad/widgets/frame.tsx — THE FRAME every launchpad widget renders in, and the shared row list.
//
// No layout shift: a widget's box is its grid placement (GridCanvas), decided before any data arrives, and
// a list's loading skeleton draws exactly the rows that box holds (`widgetCapacity`). Async data never
// changes a box.
import type { CSSProperties, ReactNode } from "react";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowUpRight, GripVertical } from "lucide-react";
import { cn } from "@ai-matrx/design-system";
import { GRID_CANVAS_GAP_PX, GRID_CANVAS_ROW_PX } from "@ai-matrx/design-system";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
/** Row height of a widget list (px): desktop, and touch screens (the 44px tap minimum). */
export const WIDGET_ROW_PX = 32;
export const WIDGET_ROW_PX_TOUCH = 44;
/** The header strip of a widget (px). */
export const WIDGET_HEADER_PX = 36;

/** How many list rows a widget `h` grid rows tall holds (the skeleton draws exactly this many). */
export function widgetCapacity(h: number, touch = false): number {
  const row = touch ? WIDGET_ROW_PX_TOUCH : WIDGET_ROW_PX;
  const body = h * GRID_CANVAS_ROW_PX - GRID_CANVAS_GAP_PX - WIDGET_HEADER_PX - 4;
  return Math.max(1, Math.floor(body / row));
}

export function WidgetFrame({
  type,
  icon: Icon,
  title,
  href,
  controls,
  children,
  previewing,
  editing,
  phoneBodyPx,
}: {
  type: string;
  icon: LucideIcon;
  title: string;
  href?: string | null | undefined;
  controls?: ReactNode;
  children: ReactNode;
  previewing?: boolean;
  /** Edit mode: the header is the drag handle and holds the controls. */
  editing?: boolean;
  /**
   * The body's own height on a phone (the widget type's `phoneBodyPx`): reserved from the first HTML, before
   * the body draws, so a phone box (which grows to its content) is already that tall and nothing below moves.
   */
  phoneBodyPx?: number | undefined;
}) {
  return (
    <section
      data-launchpad-widget={type}
      className={cn("flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card", previewing && "opacity-90")}
    >
      <header
        data-grid-drag-handle={editing ? "" : undefined}
        style={{ height: WIDGET_HEADER_PX }}
        className={cn("flex shrink-0 items-center gap-2", editing ? "pl-1 pr-1" : "px-3")}
      >
        {editing ? (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        {/* `title` = the tooltip, shown only where the box is narrow enough to cut the name. */}
        {href && !editing ? (
          <Link href={href} title={title} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
            {title}
          </Link>
        ) : (
          <h2 title={title} className="min-w-0 flex-1 truncate text-sm font-medium">
            {title}
          </h2>
        )}
        {controls ? <div className="flex shrink-0 items-center">{controls}</div> : null}
      </header>
      <div
        data-launchpad-body
        style={phoneBodyPx ? ({ "--launchpad-phone-body": `${phoneBodyPx}px` } as CSSProperties) : undefined}
        className={cn(
          "min-h-0 flex-1 overflow-hidden px-1 pb-1",
          // The grid canvas's phone test (its container under 40rem), the one place a box grows to its content.
          phoneBodyPx && "@max-[40rem]/matrx-grid-canvas:min-h-(--launchpad-phone-body)",
          editing && "pointer-events-none select-none",
        )}
        inert={editing || undefined}
      >
        {children}
      </div>
    </section>
  );
}

export interface WidgetRow {
  key: string;
  title: string;
  href?: string | null | undefined;
  meta?: string | null | undefined;
  icon?: LucideIcon | undefined;
  tone?: "default" | "warning" | "muted";
  action?: ReactNode;
  /**
   * The page bus: when present the row PICKS (offers this row to the widgets connected to this one) instead
   * of opening; `href` then opens from a quiet arrow at the row's end. Absent = the row opens, as always.
   */
  onSelect?: (() => void) | undefined;
  selected?: boolean | undefined;
}

/** A list body: skeleton rows while loading (same count the slot holds), then up to that many rows. */
export function WidgetList({
  capacity,
  loading,
  error,
  rows,
  empty,
}: {
  /** Rows the widget's box holds at desktop row height (`widgetCapacity`). */
  capacity: number;
  loading: boolean;
  error?: string | null | undefined;
  rows: readonly WidgetRow[];
  empty: ReactNode;
}) {
  // Touch screens get 44px rows (the tap minimum); fewer of them fit the same slot.
  const touch = useIsMobile();
  const rowPx = touch ? WIDGET_ROW_PX_TOUCH : WIDGET_ROW_PX;
  // Same box, taller rows on touch: fewer fit.
  const count = touch ? Math.max(1, Math.floor((capacity * WIDGET_ROW_PX) / WIDGET_ROW_PX_TOUCH)) : capacity;
  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} style={{ height: rowPx }} className="flex items-center px-2">
            <span className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }
  if (error) return <WidgetNotice tone="error">{error}<ErrorAlchemyMenu error={error} /></WidgetNotice>;
  if (rows.length === 0) return <WidgetNotice>{empty}</WidgetNotice>;
  return (
    <ul>
      {rows.slice(0, count).map((row) => {
        const Icon = row.icon;
        const inner = (
          <>
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
            <span
              title={row.title}
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                row.tone === "muted" && "text-muted-foreground",
                row.tone === "warning" && "text-warning",
              )}
            >
              {row.title}
            </span>
            {row.meta ? (
              <span
                className={cn(
                  "shrink-0 text-xs text-muted-foreground",
                  row.tone === "warning" && "text-warning",
                )}
              >
                {row.meta}
              </span>
            ) : null}
          </>
        );
        return (
          <li key={row.key} style={{ height: rowPx }} className="flex items-center gap-1">
            {row.onSelect ? (
              <>
                <button
                  type="button"
                  data-clickable
                  aria-pressed={Boolean(row.selected)}
                  onClick={row.onSelect}
                  className={cn(
                    "flex h-full min-w-0 flex-1 items-center gap-2 rounded px-2 text-left hover:bg-muted",
                    row.selected && "bg-muted font-medium",
                  )}
                >
                  {inner}
                </button>
                {row.href ? (
                  <Link
                    href={row.href}
                    data-clickable
                    aria-label={`Open ${row.title}`}
                    title="Open"
                    className="flex h-full w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : null}
              </>
            ) : row.href ? (
              <Link
                href={row.href}
                data-clickable
                className="flex h-full min-w-0 flex-1 items-center gap-2 rounded px-2 hover:bg-muted"
              >
                {inner}
              </Link>
            ) : (
              <div className="flex h-full min-w-0 flex-1 items-center gap-2 px-2">{inner}</div>
            )}
            {row.action}
          </li>
        );
      })}
    </ul>
  );
}

export function WidgetNotice({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center gap-2 px-3 text-center text-xs text-muted-foreground",
        tone === "error" && "text-destructive",
      )}
    >
      {tone === "error" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      <span className="line-clamp-2">{children}</span>
    </div>
  );
}
