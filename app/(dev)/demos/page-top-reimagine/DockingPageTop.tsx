"use client";

// THE DOCKING PAGE TOP — bake-off concept (ui-reimagine, 2026-10-22).
//
// References: Apple's large-title navigation (the page's name is BIG at rest and docks into the
// bar as you scroll) for the title, and Vercel's dashboard for the tabs row (one underline row that
// sticks under the bar, scrolls sideways on a phone, the selected tab always in view).
//
// One object, three moments:
//   at rest   path row (ancestors) · large title band (the title IS the level's door) · numbers · tabs
//   scrolled  the title and a one-line digest of the numbers dock into the path row; the tabs stick
//             under it; both become the floating glass bar (glass only while content moves behind)
//   phone     back · docked title · star · "…"; tabs scroll sideways with edge fades; numbers swipe
//
// The page top owns its scroll element, so docking is measured, never guessed.
import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, MoreHorizontal, Star } from "lucide-react";
import { Button, Tabs } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { CrumbDoor, crumbDoorOf } from "@/features/shell/frame/CrumbDoor";
import type { FrameCrumb } from "@/features/shell/frame/types";
import type { FrameFavorite } from "@/features/shell/frame/SheetHeader";
import { PageTopActionsMenu, type PageTopAction } from "./PageTopActionsMenu";

export interface PageTopTabs {
  label: string;
  value: string;
  items: readonly { value: string; label: string; count?: number | null }[];
  onValueChange: (value: string) => void;
}

export interface DockingPageTopProps {
  /** The full trail from the product icon to this page (pageTrailCrumbs); the last level is this page. */
  crumbs: readonly FrameCrumb[];
  favorite?: FrameFavorite;
  actions: readonly PageTopAction[];
  /** The hero band: one line under the large title and the page's primary action. Absent = the title lives docked. */
  intro?: { line?: string; primary?: ReactNode } | null;
  /** The summary-numbers band (KpiTiles). */
  numbers?: ReactNode;
  /** The numbers as one short line, shown in the bar once docked ("24 brands · 31 sites"). */
  digest?: string;
  tabs?: PageTopTabs | null;
  isPhone: boolean;
  onBack?: () => void;
  children: ReactNode;
}

const PATH_ROW_H = 44;

/** True once `sentinel` has scrolled above the scroller's top + offset. */
function useScrolledPast(scroller: RefObject<HTMLElement | null>, sentinel: RefObject<HTMLElement | null>, offset: number, enabled: boolean) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const s = sentinel.current;
      if (!s) return;
      setPast(s.getBoundingClientRect().top - el.getBoundingClientRect().top < offset);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scroller, sentinel, offset, enabled]);
  return enabled ? past : true;
}

export function DockingPageTop({ crumbs, favorite, actions, intro, numbers, digest, tabs, isPhone, onBack, children }: DockingPageTopProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const titleEndRef = useRef<HTMLDivElement>(null);
  const tabsStartRef = useRef<HTMLDivElement>(null);
  const hasBand = Boolean(intro);
  const docked = useScrolledPast(scrollerRef, titleEndRef, PATH_ROW_H, hasBand);
  const tabsStuck = useScrolledPast(scrollerRef, tabsStartRef, PATH_ROW_H + 1, Boolean(tabs));
  const current = crumbs[crumbs.length - 1];
  const ancestors = crumbs.slice(0, -1);
  const currentDoor = current ? crumbDoorOf(current) : undefined;
  // A different page (another record from a door) starts at its top, title large again.
  const pageName = current?.label;
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [pageName]);
  // The bar floats (glass) only while content scrolls behind it.
  const barFloats = docked && !tabs ? true : docked && !tabsStuck;

  const star = favorite ? (
    <Button
      variant="quiet"
      icon={<Star className={cn(favorite.starred && "fill-current")} />}
      aria-label={favorite.known === false ? "Favorites loading" : favorite.starred ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorite.known === false ? undefined : favorite.starred}
      disabled={favorite.known === false}
      onClick={favorite.onToggle}
    />
  ) : null;

  const menu = (
    <PageTopActionsMenu
      actions={actions}
      title={current?.label ?? "This page"}
      trigger={<Button variant="quiet" icon={<MoreHorizontal />} aria-label="All actions" />}
    />
  );

  // The docked title: the same level, same door, now small and in the bar.
  const dockedTitle = current ? (
    <div
      aria-hidden={!docked}
      className={cn(
        "flex min-w-0 items-center gap-0.5 transition-[opacity,transform] duration-[var(--matrx-motion-duration-panel)] ease-[var(--matrx-motion-ease-panel)]",
        docked ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
      )}
      inert={!docked}
    >
      <h2 className="type-title min-w-0 truncate px-1">{current.label}</h2>
      {currentDoor && !isPhone ? <CrumbDoor door={currentDoor} /> : null}
    </div>
  ) : null;

  return (
    <div ref={scrollerRef} data-matrx-page-scroll="" className="relative h-full overflow-y-auto overscroll-contain bg-textured">
      {/* ── the path row ── */}
      <header
        data-page-top="path"
        style={{ height: PATH_ROW_H }}
        className={cn(
          "sticky top-0 z-30 flex items-center gap-1 px-2 transition-colors",
          barFloats
            ? "border-b border-glass-edge bg-glass shadow-glass backdrop-blur-glass backdrop-saturate-glass"
            : docked
              ? "bg-background"
              : "border-b border-transparent bg-transparent",
        )}
      >
        {isPhone ? (
          <>
            {onBack ? <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} /> : null}
            <div className="flex min-w-0 flex-1 items-center">{dockedTitle}</div>
          </>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center">
              <ol className="flex min-w-0 items-center gap-0.5">
                {ancestors.map((crumb, i) => (
                  <Fragment key={crumb.id}>
                    {i > 0 ? (
                      <li aria-hidden className="flex shrink-0 items-center text-muted-foreground">
                        <ChevronRight className="size-3.5" />
                      </li>
                    ) : null}
                    <li className="flex min-w-0 max-w-48 items-center">
                      <AncestorLevel crumb={crumb} />
                    </li>
                  </Fragment>
                ))}
                <li aria-hidden className={cn("flex shrink-0 items-center text-muted-foreground transition-opacity", docked ? "opacity-100" : "opacity-0")}>
                  <ChevronRight className="size-3.5" />
                </li>
                <li className="flex min-w-0 items-center">{dockedTitle}</li>
              </ol>
            </nav>
            <div className="flex-1" />
            {digest ? (
              <p
                aria-hidden={!docked}
                className={cn(
                  "type-meta hidden shrink-0 truncate text-muted-foreground transition-opacity lg:block",
                  docked ? "opacity-100" : "opacity-0",
                )}
              >
                {digest}
              </p>
            ) : null}
          </>
        )}
        <div className="flex shrink-0 items-center">
          {star}
          {menu}
        </div>
      </header>

      {/* ── the large title band (the hero) ── */}
      {intro && current ? (
        <section data-page-top="title" className="px-4 pb-3 pt-2 md:px-6">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              {currentDoor ? (
                <CrumbDoor
                  door={currentDoor}
                  trigger={
                    <button
                      type="button"
                      data-crumb-door={currentDoor.kind}
                      aria-label={`${current.label}: go to another in ${currentDoor.label}`}
                      className="group -ml-1 flex max-w-full items-center gap-1 rounded-md px-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <h1 className="type-heading min-w-0 truncate">{current.label}</h1>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                    </button>
                  }
                />
              ) : (
                <h1 className="type-heading truncate">{current.label}</h1>
              )}
              {intro.line ? <p className="type-secondary mt-0.5 truncate text-muted-foreground">{intro.line}</p> : null}
            </div>
            {intro.primary ? <div className="flex shrink-0 items-center">{intro.primary}</div> : null}
          </div>
        </section>
      ) : null}
      <div ref={titleEndRef} aria-hidden />

      {/* ── the numbers band ── */}
      {numbers ? (
        <section data-page-top="numbers" aria-label="Summary" className="px-4 pb-3 md:px-6">
          {numbers}
        </section>
      ) : null}

      {/* ── the tabs row ── */}
      <div ref={tabsStartRef} aria-hidden />
      {tabs ? (
        <StickyTabs tabs={tabs} stuck={tabsStuck} top={PATH_ROW_H} />
      ) : null}

      <div className="px-4 pb-[var(--matrx-page-runway,50dvh)] pt-3 md:px-6">{children}</div>
    </div>
  );
}

/** An ancestor level: its text is the link back, its chevron is the door to everything at that level. */
function AncestorLevel({ crumb }: { crumb: FrameCrumb }) {
  const door = crumbDoorOf(crumb);
  const Icon = crumb.icon;
  const face =
    crumb.iconOnly && Icon ? (
      <span className="flex size-5 items-center justify-center" title={crumb.label}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{crumb.label}</span>
      </span>
    ) : (
      crumb.label
    );
  const cls =
    "type-body block max-w-full truncate rounded-md px-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";
  if (door && crumb.iconOnly && door.kind === "products") {
    return (
      <CrumbDoor
        door={door}
        trigger={
          <button type="button" data-crumb-door={door.kind} aria-label={`${crumb.label}: all products`} className={cn(cls, "flex items-center gap-0.5")}>
            {face}
            <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
          </button>
        }
      />
    );
  }
  return (
    <>
      {crumb.href ? (
        <a
          href={crumb.href}
          className={cls}
          onClick={(e) => {
            if (!crumb.onSelect || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            crumb.onSelect();
          }}
        >
          {face}
        </a>
      ) : (
        <span className={cls}>{face}</span>
      )}
      {door ? <CrumbDoor door={door} /> : null}
    </>
  );
}

/**
 * The tabs row: the design system's underline Tabs, in a row that sticks under the path row and
 * scrolls sideways when the tabs outgrow the width. Edge fades say there is more; the selected tab
 * is always scrolled into view (a deep link to the 7th tab on a phone shows the 7th tab).
 */
/** The design system's tablist is the element that scrolls sideways; the row reads and steers it. */
function tablistIn(rail: HTMLElement | null): HTMLElement | null {
  return rail?.querySelector<HTMLElement>('[role="tablist"]') ?? null;
}

function StickyTabs({ tabs, stuck, top }: { tabs: PageTopTabs; stuck: boolean; top: number }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = tablistIn(railRef.current);
    if (!el) return;
    const measure = () => setEdges({ start: el.scrollLeft > 2, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = tablistIn(railRef.current);
    const active = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !active) return;
    const a = active.getBoundingClientRect();
    const left = el.scrollLeft + (a.left - el.getBoundingClientRect().left) - el.clientWidth / 2 + a.width / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [tabs.value]);

  const mask =
    edges.start && edges.end
      ? "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)"
      : edges.end
        ? "linear-gradient(to right, black calc(100% - 24px), transparent)"
        : edges.start
          ? "linear-gradient(to right, transparent, black 24px)"
          : undefined;

  return (
    <div
      data-page-top="tabs"
      style={{ top }}
      className={cn(
        "sticky z-20 border-b transition-colors",
        stuck
          ? "border-glass-edge bg-glass shadow-glass backdrop-blur-glass backdrop-saturate-glass"
          : "border-border bg-transparent",
      )}
    >
      <div ref={railRef} className="px-4 md:px-6" style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}>
        <Tabs
          aria-label={tabs.label}
          value={tabs.value}
          onValueChange={tabs.onValueChange}
          rule={false}
          data={tabs.items.map((t) => ({ value: t.value, label: t.label, count: t.count ?? undefined }))}
        />
      </div>
    </div>
  );
}
