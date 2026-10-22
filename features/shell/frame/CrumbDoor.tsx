"use client";

// EVERY CRUMB IS A DOOR (Arman, 2026-10-22: "make it where clicking on each element allows you to go
// to everything else at that level … That's the easiest way to allow a user to never feel trapped").
//
// One searchable dropdown for every crumb level:
//   products  the product icon: every product (new tab — the app grid's rule) + every page by search
//   places    the product's first level: the product's first-tier places + every page by search
//   siblings  a record (or any deeper level): its sibling records, filtered as you type
// Keyboard: the search field has focus on open; ArrowDown enters the list, arrows move, Enter on the
// field opens the first match, Esc clears then closes. The crumb's own text stays a link (a door
// never replaces the way back); the product icon has no text, so it IS the door's trigger.
import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { SearchField } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { rankMenuSearch } from "./searchEngine";
import { isPlainClick } from "./plainClick";
import type { FrameCrumb, FrameCrumbDoor, FrameCrumbOption, FrameDoorSearchEntry } from "./types";

/** Rows shown before "more" — a door is a list to glance at; the search reaches the rest. */
export const DOOR_ROWS_MAX = 50;
const PAGE_HITS_MAX = 8;
const ROW_SELECTOR = "[data-crumb-door-row]";

/** The door a crumb opens: its own, else its sibling options as a siblings door, else none. */
export function crumbDoorOf(crumb: FrameCrumb): FrameCrumbDoor | undefined {
  if (crumb.door) return crumb.door;
  if ((crumb.options && crumb.options.length > 0) || crumb.loadOptions) {
    return {
      kind: "siblings",
      label: crumb.optionsLabel ?? crumb.label,
      options: crumb.options,
      loadOptions: crumb.loadOptions,
      allHref: crumb.optionsAllHref,
      allLabel: crumb.optionsAllLabel,
    };
  }
  return undefined;
}

/** Rows that match the query (label words), best first; no query = every row. */
export function filterDoorRows<T extends FrameCrumbOption>(rows: readonly T[], query: string): T[] {
  const q = query.trim();
  if (!q) return [...rows];
  const byId = new Map(rows.map((r, i) => [`${i}`, r]));
  return rankMenuSearch(
    rows.map((r, i) => ({ id: `${i}`, label: r.label, trail: [], href: r.href })),
    q,
    rows.length,
  ).map((e) => byId.get(e.id)!);
}

export interface CrumbDoorProps {
  door: FrameCrumbDoor;
  /** The trigger; default the level's down chevron. */
  trigger?: ReactNode;
}

export function CrumbDoor({ door, trigger }: CrumbDoorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<readonly FrameCrumbOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pages, setPages] = useState<readonly FrameDoorSearchEntry[] | null>(null);
  const pagesRequested = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = [...(door.options ?? []), ...(loaded ?? [])];
  const shown = filterDoorRows(rows, query).slice(0, DOOR_ROWS_MAX);
  const known = new Set(rows.map((r) => r.href));
  const pageHits =
    query.trim() && pages
      ? rankMenuSearch(pages, query.trim(), PAGE_HITS_MAX * 3).filter((p) => !known.has(p.href)).slice(0, PAGE_HITS_MAX)
      : [];
  const waiting = Boolean(door.loadOptions) && loaded == null && !loadFailed;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      return;
    }
    if (door.loadOptions && loaded == null) {
      setLoadFailed(false);
      door
        .loadOptions()
        .then((list) => setLoaded(list))
        .catch((error: unknown) => {
          console.error(`[crumb-door] the ${door.label} list failed to load`, error);
          setLoadFailed(true);
        });
    }
  }

  function onQueryChange(next: string) {
    setQuery(next);
    if (next.trim() && door.loadSearchIndex && !pagesRequested.current) {
      pagesRequested.current = true;
      door
        .loadSearchIndex()
        .then(setPages)
        .catch((error: unknown) => {
          pagesRequested.current = false;
          console.error("[crumb-door] the page search index failed to load", error);
        });
    }
  }

  function go(option: { href: string; onSelect?: () => void }, newTab: boolean) {
    setOpen(false);
    if (newTab) openOutbound(option.href, "_blank", "noopener,noreferrer");
    else if (option.onSelect) option.onSelect();
    else window.location.assign(option.href);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const first = shown[0] ?? pageHits[0];
      if (!first) return;
      e.preventDefault();
      go(first, rowOpensNewTab(door, first));
    } else if (e.key === "ArrowDown") {
      const el = listRef.current?.querySelector<HTMLElement>(ROW_SELECTOR);
      if (el) {
        e.preventDefault();
        el.focus();
      }
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const all = [...(listRef.current?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? all[at + 1] : at <= 0 ? searchRef.current : all[at - 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  const label = door.label;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button type="button" aria-label={`Go to another in ${label}`} data-crumb-door={door.kind} className={SWITCH_CLASS}>
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        width="md"
        padding="none"
        surface="solid"
        data-crumb-door-panel={door.kind}
        onEscapeKeyDown={(e) => {
          if (!query) return;
          e.preventDefault();
          setQuery("");
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="px-2 pt-2">
          <SearchField
            ref={searchRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={door.loadSearchIndex ? "Search everything" : `Search ${label}`}
            aria-label={door.loadSearchIndex ? "Search everything" : `Search ${label}`}
          />
        </div>
        <div ref={listRef} role="group" aria-label={label} onKeyDown={onListKeyDown} className="max-h-[60dvh] overflow-y-auto overscroll-contain p-1">
          <p className="type-meta px-2 pb-1 pt-2 text-muted-foreground">{label}</p>
          {shown.map((o) => (
            <DoorRow key={`${o.href}|${o.label}`} option={o} newTab={rowOpensNewTab(door, o)} onGo={go} mark={markOf(o)} />
          ))}
          {waiting ? <p className="type-meta px-2 py-1.5 text-muted-foreground">Loading…</p> : null}
          {loadFailed ? <p className="type-meta px-2 py-1.5 text-destructive">Could not load this list</p> : null}
          {!waiting && shown.length === 0 && pageHits.length === 0 ? (
            <p className="type-meta px-2 py-1.5 text-muted-foreground">No matches</p>
          ) : null}
          {pageHits.length > 0 ? (
            <>
              <p className="type-meta px-2 pb-1 pt-2 text-muted-foreground">Pages</p>
              {pageHits.map((p) => (
                <DoorRow
                  key={p.id}
                  option={{ label: p.label, href: p.href }}
                  hint={p.trail.join(" › ")}
                  newTab={door.kind === "products"}
                  onGo={go}
                />
              ))}
            </>
          ) : null}
          {door.allHref ? (
            <DoorRow option={{ label: door.allLabel ?? "View all", href: door.allHref }} newTab={false} onGo={go} />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Products open in a new tab (the app grid's rule) — except the product you are in, which goes home here. */
function rowOpensNewTab(door: FrameCrumbDoor, option: FrameCrumbOption): boolean {
  return Boolean(door.newTab) && !option.active;
}

function markOf(option: FrameCrumbOption & { icon?: LucideIcon }): ReactNode {
  const Icon = option.icon;
  return Icon ? <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null;
}

function DoorRow({
  option,
  newTab,
  onGo,
  mark,
  hint,
}: {
  option: FrameCrumbOption;
  newTab: boolean;
  onGo: (o: FrameCrumbOption, newTab: boolean) => void;
  mark?: ReactNode;
  hint?: string;
}) {
  return (
    <a
      href={option.href}
      data-crumb-door-row=""
      aria-current={option.active ? "page" : undefined}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      title={hint}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        onGo(option, newTab);
      }}
      className="type-body flex min-h-7 items-center gap-2 rounded-md px-2 text-foreground outline-none hover:bg-accent focus-visible:bg-accent"
    >
      {mark ?? <Check aria-hidden className={cn("size-3.5 shrink-0", !option.active && "invisible")} />}
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {hint ? <span className="type-meta max-w-[45%] truncate text-muted-foreground">{hint}</span> : null}
    </a>
  );
}

const SWITCH_CLASS =
  "flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";
