"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ComingSoonBadge } from "@/components/coming-soon/ComingSoonBadge";
import AppLink from "@/components/navigation/AppLink";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShellIcon from "@/features/shell/components/ShellIcon";
import type { ShellIconName } from "@/features/shell/shellIconMap";
import { cn } from "@/lib/utils";
import { formatMetricNumber } from "./metricNumber";

export interface MetricNavigationItem {
  key: string;
  label: string;
  href: string;
  iconName: ShellIconName;
  /** Kept for caller compatibility; the bar renders every icon in one ink. */
  color?: string;
  /** Omit when this destination has no honest metric. */
  value?: number | string;
  /** Describes the metric value, independently from destination availability. */
  state?: "ready" | "loading" | "unavailable";
  /** A concise explanation of the count's scope. */
  description?: string;
  external?: boolean;
  /** A destination can be visibly unavailable without making its count unknown. */
  availability?: "ready" | "coming-soon" | "unavailable";
}

export interface MetricNavigationProps {
  /** Accessible name for this compact navigation group. */
  label: string;
  items: readonly MetricNavigationItem[];
  className?: string;
}

/** Width kept free for the "More" trigger while deciding what fits. */
const MORE_WIDTH_PX = 84;
const GAP_PX = 2;

function formatValue(value: number | string): string {
  return typeof value === "number" ? formatMetricNumber(value) : value;
}

function Counter({ item }: { item: MetricNavigationItem }) {
  const state = item.state ?? "ready";
  if (state === "loading") {
    return (
      <span
        aria-label="Loading count"
        className="h-4 w-6 shrink-0 animate-pulse rounded-full bg-muted"
      />
    );
  }
  if (state === "unavailable") {
    return <span className="shrink-0 text-xs text-muted-foreground">—</span>;
  }
  if (item.value === undefined) return null;
  return (
    <span className="min-w-5 max-w-16 shrink-0 truncate rounded-full bg-muted px-1.5 text-center text-xs font-medium tabular-nums leading-5 text-foreground">
      {formatValue(item.value)}
    </span>
  );
}

function ItemBody({ item }: { item: MetricNavigationItem }) {
  return (
    <>
      <ShellIcon
        name={item.iconName}
        size={15}
        strokeWidth={1.75}
        className="shrink-0 text-muted-foreground"
      />
      <span className="max-w-48 truncate">{item.label}</span>
      <Counter item={item} />
    </>
  );
}

function accessibleLabel(item: MetricNavigationItem): string {
  const state = item.state ?? "ready";
  const description =
    state === "unavailable" ? "Count unavailable" : item.description;
  return [item.label, state === "ready" ? item.value : undefined, description]
    .filter((part): part is string | number => part !== undefined)
    .join(", ");
}

/** Built destinations keep host order; reserved ones sink toward "More". */
function ordered(items: readonly MetricNavigationItem[]) {
  const live = items.filter((i) => (i.availability ?? "ready") === "ready");
  const rest = items.filter((i) => (i.availability ?? "ready") !== "ready");
  return [...live, ...rest];
}

function isActive(pathname: string | null, href: string) {
  return !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
}

const ITEM_CLASS =
  "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A module's destinations as ONE row of quiet tabs with counters — the GitHub
 * UnderlineNav / Linear / Vercel pattern. Whatever does not fit the row moves
 * into a trailing "More" menu (priority+ overflow), so a module with 15
 * destinations never becomes a wall of bordered pills. The row height is fixed,
 * so measuring, counts landing, and resizing never shift the page.
 *
 * History: 2026-10-13 the owner called the old wrapping bordered pills (three
 * rows of them on /marketing) "the ugliest things I've ever seen". Do not
 * reintroduce wrapping, per-item borders, or tinted icon chips here.
 */
export function MetricNavigation({
  label,
  items,
  className,
}: MetricNavigationProps) {
  const pathname = usePathname();
  const all = ordered(items);
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(all.length);

  useLayoutEffect(() => {
    const row = navRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const widths = Array.from(measure.children).map(
        (child) => (child as HTMLElement).offsetWidth,
      );
      const available = row.clientWidth;
      const total = widths.reduce((sum, w) => sum + w + GAP_PX, 0);
      if (total <= available) {
        setVisibleCount(widths.length);
        return;
      }
      let used = MORE_WIDTH_PX;
      let fit = 0;
      for (const w of widths) {
        if (used + w + GAP_PX > available) break;
        used += w + GAP_PX;
        fit += 1;
      }
      setVisibleCount(fit);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(row);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [all.length]);

  const visible = all.slice(0, visibleCount);
  const overflow = all.slice(visibleCount);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={cn(
        "relative flex h-11 min-w-0 items-center border-b border-border",
        className,
      )}
    >
      {/* Off-screen copy of every item: the widths the fit is computed from. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex"
      >
        {all.map((item) => (
          <span key={item.key} className={ITEM_CLASS}>
            <ItemBody item={item} />
          </span>
        ))}
      </div>

      <div className="flex min-w-0 items-center gap-0.5 overflow-hidden">
        {visible.map((item) => {
          const active = isActive(pathname, item.href);
          const reserved = (item.availability ?? "ready") !== "ready";
          return (
            <AppLink
              key={item.key}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              title={item.description}
              aria-label={accessibleLabel(item)}
              aria-current={active ? "page" : undefined}
              data-surface-value={
                item.value !== undefined ? `${item.key}_count` : undefined
              }
              className={cn(
                ITEM_CLASS,
                "relative",
                active
                  ? "text-foreground after:absolute after:inset-x-2 after:-bottom-[5px] after:h-0.5 after:rounded-full after:bg-primary"
                  : "text-foreground hover:bg-accent hover:text-foreground",
                reserved && "opacity-60",
              )}
            >
              <ItemBody item={item} />
            </AppLink>
          );
        })}
      </div>

      {overflow.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                ITEM_CLASS,
                "ml-0.5 text-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
              )}
            >
              More
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((item) => (
              <DropdownMenuItem key={item.key} asChild>
                <AppLink
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  title={item.description}
                  aria-label={accessibleLabel(item)}
                  className="flex min-w-56 items-center gap-2"
                >
                  <ShellIcon
                    name={item.iconName}
                    size={15}
                    strokeWidth={1.75}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.availability === "coming-soon" ? (
                    <ComingSoonBadge />
                  ) : item.availability === "unavailable" ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      Unavailable
                    </Badge>
                  ) : (
                    <Counter item={item} />
                  )}
                </AppLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
