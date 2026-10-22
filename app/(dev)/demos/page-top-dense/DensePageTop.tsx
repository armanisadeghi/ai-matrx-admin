"use client";

// THE DENSE PAGE TOP (ui-dense bake-off entry, 2026-10-22). Everything above a page's own body, in
// four optional bands that share one left edge and one hairline rhythm:
//
//   1. path row     44px — every crumb is a door (CrumbDoor), star, "…" with every action; never scrolls
//   2. intro band   40px — the record's identity facts in ONE line (never repeats the title)
//   3. figures band 32px — a ticker of label/value cells (Bloomberg strip), each a drill-in
//   4. tabs row     36px — underline tabs with counts; sticky (desktop); scrolls sideways (phone)
//
// Champions: Linear's view header for the path row (crumbs that switch, one "…"), GitHub's repo
// UnderlineNav for the tabs (icon + label + count, one hairline, sticky), a Bloomberg strip for the
// figures. When the intro and figures scroll away, the stuck tabs row carries a compact echo of the
// page (its title and the first figures) so the page never loses its context while scrolled.
import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, MoreHorizontal, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  Tabs as TabsRoot,
} from "@ai-matrx/design-system";
import { Button, CONTROLS_CONTAINER_CLASS, TabsList, TabsTrigger } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { TapSurface } from "@ai-matrx/design-system/tap-target";
import { CrumbDoor, crumbDoorOf } from "@/features/shell/frame/CrumbDoor";
import { isPlainClick } from "@/features/shell/frame/plainClick";
import type { FrameCrumb } from "@/features/shell/frame/types";

export interface DenseAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** The menu groups actions by this heading, in first-seen order. */
  group?: string;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
}

export interface DenseFavorite {
  starred: boolean;
  known: boolean;
  onToggle: () => void;
}

export interface DenseFigure {
  id: string;
  label: string;
  /** `null` = not measured: shows "—", never 0. */
  value: ReactNode | null;
  /** A second, quieter value ("of 12"). */
  sub?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
  /** One sentence: what the number counts (the cell's tooltip). */
  title?: string;
  onSelect?: () => void;
}

export interface DenseTab {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number | null;
  /** The count is something waiting on the person (an attention tint). */
  attention?: boolean;
}

export interface DensePageTopProps {
  crumbs: readonly FrameCrumb[];
  favorite?: DenseFavorite;
  actions: readonly DenseAction[];
  /** The page's ONE primary verb, at the path row's right edge. */
  primary?: ReactNode;
  /** The intro band: a lead mark and one line of facts. */
  intro?: { mark?: ReactNode; lead?: ReactNode; facts: readonly ReactNode[] };
  figures?: readonly DenseFigure[];
  /** True while the figures are being read: the band keeps its height with placeholders. */
  figuresLoading?: boolean;
  tabs?: readonly DenseTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  children: ReactNode;
}

const TONE_INK: Record<NonNullable<DenseFigure["tone"]>, string> = {
  neutral: "text-foreground",
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
};

export function DensePageTop(props: DensePageTopProps) {
  const { crumbs, favorite, actions, primary, intro, figures, figuresLoading, tabs, activeTab, onTabChange, children } = props;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const hasTopBands = Boolean(intro) || Boolean(figures?.length);

  // The tabs row is "stuck" once the bands above it have scrolled out of the scroller.
  useEffect(() => {
    const root = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasTopBands) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { root, threshold: 0 });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasTopBands]);

  const current = crumbs[crumbs.length - 1];
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-textured", CONTROLS_CONTAINER_CLASS)}>
      <TapSurface surface="solid">
        <PathRow crumbs={crumbs} favorite={favorite} actions={actions} primary={primary} />
      </TapSurface>
      <div ref={scrollerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {intro ? <IntroBand {...intro} /> : null}
        {figures?.length ? <FiguresBand figures={figures} loading={figuresLoading} /> : null}
        <div ref={sentinelRef} aria-hidden className="h-px shrink-0" />
        {tabs?.length ? (
          <TabsRow
            tabs={tabs}
            active={activeTab ?? tabs[0].value}
            onChange={onTabChange}
            echo={stuck ? { title: current?.label, figures: figures?.slice(0, 3) } : undefined}
          />
        ) : null}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── 1. Path row ─────────────────────────────────────────────────────────────────────────────

const CRUMB_LINK =
  "type-body block max-w-full truncate rounded-md px-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

function PathRow({
  crumbs,
  favorite,
  actions,
  primary,
}: Pick<DensePageTopProps, "crumbs" | "favorite" | "actions" | "primary">) {
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : undefined;
  return (
    <header className="matrx-touch-targets flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
      {/* Phone: the parent level is a back arrow; its door stays reachable from the trail on wider screens. */}
      {parent?.href ? (
        <Button
          className="sm:hidden"
          variant="quiet"
          icon={<ArrowLeft />}
          aria-label={`Back to ${parent.label}`}
          onClick={() => (parent.onSelect ? parent.onSelect() : window.location.assign(parent.href!))}
        />
      ) : null}
      <nav aria-label="Breadcrumb" className="flex min-w-0 shrink items-center">
        <ol className="flex min-w-0 items-center gap-0.5">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            // Phone keeps the last level only; tablet and up show the whole trail.
            const phoneHidden = !isLast && "hidden sm:flex";
            return (
              <Fragment key={crumb.id}>
                {i > 0 ? (
                  <li aria-hidden className="hidden shrink-0 items-center text-muted-foreground sm:flex">
                    <ChevronRight className="size-3.5" />
                  </li>
                ) : null}
                <li className={cn("flex min-w-0 items-center", isLast ? "shrink" : "max-w-45 shrink-[2]", phoneHidden)}>
                  <CrumbLevel crumb={crumb} isLast={isLast} />
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      <div className="flex shrink-0 items-center">
        {favorite ? (
          <Button
            variant="quiet"
            icon={<Star className={cn(favorite.starred && "fill-current text-warning")} />}
            aria-label={!favorite.known ? "Favorites loading" : favorite.starred ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite.known ? favorite.starred : undefined}
            disabled={!favorite.known}
            onClick={favorite.onToggle}
          />
        ) : null}
        <PageMenu actions={actions} />
      </div>
      <div className="min-w-2 flex-1" />
      {primary ? <div className="flex shrink-0 items-center">{primary}</div> : null}
    </header>
  );
}

function CrumbLevel({ crumb, isLast }: { crumb: FrameCrumb; isLast: boolean }) {
  const door = crumbDoorOf(crumb);
  const Icon = crumb.icon;
  // The product mark has no text: the mark itself is its door's trigger.
  if (crumb.iconOnly && Icon && door) {
    return (
      <CrumbDoor
        door={door}
        trigger={
          <button type="button" aria-label={`${crumb.label}: everywhere else`} className={cn(CRUMB_LINK, "flex items-center")}>
            <span className="flex size-5 items-center justify-center" title={crumb.label}>
              <Icon className="size-4" aria-hidden />
            </span>
          </button>
        }
      />
    );
  }
  return (
    <>
      {isLast ? (
        <h1 aria-current="page" className="type-title truncate px-1">
          {crumb.label}
        </h1>
      ) : crumb.href ? (
        <a
          href={crumb.href}
          className={CRUMB_LINK}
          onClick={(e) => {
            if (!crumb.onSelect || !isPlainClick(e)) return;
            e.preventDefault();
            crumb.onSelect();
          }}
        >
          {crumb.label}
        </a>
      ) : (
        <span className="type-body truncate px-1 text-muted-foreground">{crumb.label}</span>
      )}
      {door ? <CrumbDoor door={door} /> : null}
    </>
  );
}

/** "…" — every action of the page, grouped, the destructive ones last behind a rule. */
function PageMenu({ actions }: { actions: readonly DenseAction[] }) {
  const plain = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);
  const groups: { name: string; items: DenseAction[] }[] = [];
  for (const a of plain) {
    const name = a.group ?? "";
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, items: [] }));
    g.items.push(a);
  }
  const item = (a: DenseAction) => {
    const Icon = a.icon;
    return (
      <DropdownMenuItem key={a.id} onSelect={a.onSelect} disabled={a.disabled} tone={a.destructive ? "danger" : undefined} size="sm">
        {Icon ? <Icon aria-hidden /> : null}
        {a.label}
        {a.shortcut ? <DropdownMenuShortcut>{a.shortcut}</DropdownMenuShortcut> : null}
      </DropdownMenuItem>
    );
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" icon={<MoreHorizontal />} aria-label="All actions" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" surface="solid" className="min-w-56">
        {groups.map((g, i) => (
          <Fragment key={g.name || `g${i}`}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {g.name ? <DropdownMenuLabel className="type-meta text-muted-foreground">{g.name}</DropdownMenuLabel> : null}
            {g.items.map(item)}
          </Fragment>
        ))}
        {destructive.length ? <DropdownMenuSeparator /> : null}
        {destructive.map(item)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── 2. Intro band ───────────────────────────────────────────────────────────────────────────

function IntroBand({ mark, lead, facts }: NonNullable<DensePageTopProps["intro"]>) {
  return (
    <section
      aria-label="About this page"
      className="flex min-h-10 shrink-0 items-center gap-2.5 border-b border-border px-3 py-1.5"
    >
      {mark ? <span className="flex size-6 shrink-0 items-center justify-center">{mark}</span> : null}
      {/* One line always: a phone scrolls the facts sideways rather than stacking them. */}
      <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-x-2 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:overflow-visible">
        {lead ? <span className="type-body min-w-0 max-w-[40ch] shrink-0 truncate text-foreground sm:shrink">{lead}</span> : null}
        {facts.map((f, i) => (
          <span key={i} className="type-meta flex shrink-0 items-center gap-2 text-muted-foreground sm:min-w-0 sm:shrink">
            {i > 0 || lead ? <span aria-hidden className="text-disabled-foreground">·</span> : null}
            <span className="min-w-0 truncate">{f}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

// ── 3. Figures band ─────────────────────────────────────────────────────────────────────────

function FigureCell({ figure, compact }: { figure: DenseFigure; compact?: boolean }) {
  const ink = figure.value === null ? "text-muted-foreground" : TONE_INK[figure.tone ?? "neutral"];
  const body = (
    <>
      <span className="type-meta shrink-0 text-muted-foreground">{figure.label}</span>
      <span className={cn("type-body shrink-0 font-semibold tabular-nums", ink)}>{figure.value ?? "—"}</span>
      {figure.sub && !compact ? <span className="type-meta shrink-0 tabular-nums text-muted-foreground">{figure.sub}</span> : null}
    </>
  );
  const cls = cn("flex h-full shrink-0 items-baseline gap-1.5 whitespace-nowrap", compact ? "px-2" : "px-3");
  if (figure.onSelect) {
    return (
      <button
        type="button"
        title={figure.title}
        onClick={figure.onSelect}
        className={cn(cls, "items-center rounded-none outline-none hover:bg-accent focus-visible:bg-accent")}
      >
        {body}
      </button>
    );
  }
  return (
    <span title={figure.title} className={cn(cls, "items-center")}>
      {body}
    </span>
  );
}

function FiguresBand({ figures, loading }: { figures: readonly DenseFigure[]; loading?: boolean }) {
  return (
    <section
      aria-label="Summary"
      aria-busy={loading || undefined}
      className="scrollbar-hide flex h-8 shrink-0 items-stretch divide-x divide-border overflow-x-auto border-b border-border"
    >
      {figures.map((f) =>
        loading ? (
          <span key={f.id} className="flex shrink-0 items-center gap-1.5 px-3">
            <span className="type-meta text-muted-foreground">{f.label}</span>
            <span aria-hidden className="h-3 w-6 animate-pulse rounded-sm bg-muted" />
          </span>
        ) : (
          <FigureCell key={f.id} figure={f} />
        ),
      )}
    </section>
  );
}

// ── 4. Tabs row ─────────────────────────────────────────────────────────────────────────────

function TabsRow({
  tabs,
  active,
  onChange,
  echo,
}: {
  tabs: readonly DenseTab[];
  active: string;
  onChange?: (value: string) => void;
  echo?: { title?: string; figures?: readonly DenseFigure[] };
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // Phone: the row scrolls sideways; the active tab is always brought into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);
  return (
    <div className="z-10 flex h-9 shrink-0 items-stretch border-b border-border bg-background md:sticky md:top-0">
      {/* The stuck echo: the page's name, so a scrolled page never loses where it is (desktop). */}
      <span
        aria-hidden={!echo}
        className={cn(
          "type-body hidden max-w-48 shrink-0 items-center truncate border-r border-border px-3 font-medium text-foreground",
          echo ? "lg:flex" : "",
        )}
      >
        {echo?.title}
      </span>
      <TabsRoot value={active} onValueChange={onChange} className="min-w-0 flex-1">
        <TabsList ref={listRef} variant="underline" rule={false} overflow="scroll" aria-label="Sections">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
                <span>{t.label}</span>
                {t.count != null ? (
                  <span
                    className={cn(
                      "type-meta ml-0.5 rounded-sm px-1 tabular-nums",
                      t.attention && t.count > 0 ? "bg-warning/15 text-warning" : "text-muted-foreground",
                    )}
                  >
                    {t.count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </TabsRoot>
      {echo?.figures?.length ? (
        <div className="hidden shrink-0 items-stretch divide-x divide-border border-l border-border xl:flex">
          {echo.figures.map((f) => (
            <FigureCell key={f.id} figure={f} compact />
          ))}
        </div>
      ) : null}
    </div>
  );
}
