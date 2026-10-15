"use client";

// components/official/tiered-breadcrumb/TieredBreadcrumb.tsx — THE TIERED BREADCRUMB (one primitive).
//
// Notion's breadcrumb, for every page that has a path: a segment opens "Other pages in <parent>"
// (tier 1, a handful then "N more", which turns the menu into a search over all of them); hovering
// a page opens the databases on it (tier 2, read once, when first opened); hovering a database
// opens its views (tier 3). Every row navigates — the page, the page at that database, the page at
// that database with that view showing. On a phone the same tiers are a bottom sheet you drill in.
//
// Hosts fill `model.ts`'s shape (Spaces pages, a table's records, the tables themselves); this file
// draws it with the design system's anchored menus (heights capped on Radix's measured space) and
// never fetches on its own.

import { createContext, useContext, useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Database, FileText, Search } from "lucide-react";
import { BottomSheet, BottomSheetBody, BottomSheetHeader, cn, useIsMobile } from "@ai-matrx/design-system";
import { RegionSkeleton, SearchField } from "@ai-matrx/design-system/controls";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { pushAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SIBLINGS_SHOWN,
  capSiblings,
  createLoadCache,
  filterItems,
  hasNextTier,
  type TieredChildrenLoader,
  type TieredItem,
  type TieredSegment,
  type TieredSiblings,
} from "./model";

export interface TieredBreadcrumbProps {
  segments: readonly TieredSegment[];
  /** Tier 2 for an item whose children are not already known (a page's databases). */
  loadChildren?: TieredChildrenLoader;
  /** The host's own segment look (Spaces keeps its crumb class). */
  segmentClassName?: string;
  /** Between segments; default "/". */
  separator?: ReactNode;
  separatorClassName?: string;
  /** What tier 2 holds, said when an item holds none ("No databases", "No views"). */
  emptyChildren?: string;
  className?: string;
}

type Cache<T> = ReturnType<typeof createLoadCache<T>>;

/** The host's words for an item that holds nothing in tier 2. */
const EmptyChildren = createContext("No databases");

/**
 * Go to a row's place. Same page, another block or view: the address changes in place and the
 * page's own hash listener scrolls (the router does not fire `hashchange`).
 */
function useGo() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  return (href: string) => {
    const target = new URL(href, window.location.href);
    if (target.pathname === pathname && (target.hash || target.search)) {
      pushAddressWithoutNavigating(target.pathname + target.search + target.hash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }
    startTransition(() => router.push(href));
  };
}

/** One read per key for the life of this breadcrumb; `read` null = nothing to read here. */
function useLoad<T>(cache: Cache<T>, key: string, read: (() => Promise<T>) | null) {
  const [state, setState] = useState<{ key: string; value?: T; failed?: boolean; error?: unknown } | null>(null);
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });
  const enabled = read !== null;
  useEffect(() => {
    const run = readRef.current;
    if (!enabled || !run) return;
    let live = true;
    cache.load(key, run).then(
      (value) => live && setState({ key, value }),
      (error: unknown) => live && setState({ key, failed: true, error }),
    );
    return () => {
      live = false;
    };
  }, [cache, key, enabled]);
  return state && state.key === key ? state : null;
}

function ItemIcon({ item, fallback }: { item: TieredItem; fallback: ReactNode }) {
  return <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">{item.icon ?? fallback}</span>;
}

const TIER_ICON = [<FileText key="page" size={15} />, <Database key="db" size={15} />, <FileText key="view" size={15} />];

export function TieredBreadcrumb({ segments, loadChildren, segmentClassName, separator = "/", separatorClassName, emptyChildren = "No databases", className }: TieredBreadcrumbProps) {
  const isMobile = useIsMobile();
  const [siblingCache] = useState(() => createLoadCache<TieredSiblings>());
  const [childCache] = useState(() => createLoadCache<readonly TieredItem[]>());
  return (
    <EmptyChildren.Provider value={emptyChildren}>
    <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center", className)} data-tiered-breadcrumb="">
      {segments.map((segment, i) => (
        <span key={segment.id} className="flex min-w-0 items-center">
          {i > 0 ? (
            <span aria-hidden="true" className={separatorClassName ?? "px-1 text-muted-foreground"}>
              {separator}
            </span>
          ) : null}
          {segment.siblings ? (
            isMobile ? (
              <SegmentSheet segment={segment} current={i === segments.length - 1} siblingCache={siblingCache} childCache={childCache} loadChildren={loadChildren} className={segmentClassName} />
            ) : (
              <SegmentMenu segment={segment} current={i === segments.length - 1} siblingCache={siblingCache} childCache={childCache} loadChildren={loadChildren} className={segmentClassName} />
            )
          ) : (
            <a href={segment.href} className={segmentClassName} data-current={i === segments.length - 1 ? "true" : undefined}>
              <SegmentFace segment={segment} />
            </a>
          )}
        </span>
      ))}
    </nav>
    </EmptyChildren.Provider>
  );
}

function SegmentFace({ segment }: { segment: TieredSegment }) {
  return (
    <>
      {segment.icon ? <span className="flex shrink-0 items-center">{segment.icon}</span> : null}
      <span className="truncate">{segment.label || "Untitled"}</span>
    </>
  );
}

interface SegmentProps {
  segment: TieredSegment;
  current: boolean;
  siblingCache: Cache<TieredSiblings>;
  childCache: Cache<readonly TieredItem[]>;
  loadChildren: TieredChildrenLoader | undefined;
  className: string | undefined;
}

// ── Desktop: anchored cascading menus ─────────────────────────────────────────────────────────

function SegmentMenu({ segment, current, siblingCache, childCache, loadChildren, className }: SegmentProps) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearching(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn("min-w-0", className)} data-current={current ? "true" : undefined} data-tiered-segment={segment.id}>
          <SegmentFace segment={segment} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72" data-tiered-tier="1">
        {open ? <SiblingsTier segment={segment} searching={searching} onSearch={() => setSearching(true)} siblingCache={siblingCache} childCache={childCache} loadChildren={loadChildren} /> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SiblingsTier({
  segment,
  searching,
  onSearch,
  siblingCache,
  childCache,
  loadChildren,
}: {
  segment: TieredSegment;
  searching: boolean;
  onSearch: () => void;
  siblingCache: Cache<TieredSiblings>;
  childCache: Cache<readonly TieredItem[]>;
  loadChildren: TieredChildrenLoader | undefined;
}) {
  const loaded = useLoad(siblingCache, segment.id, segment.siblings ?? null);
  const [query, setQuery] = useState("");
  if (!loaded) return <RegionSkeleton shape="rows" count={3} aria-label="Loading" />;
  if (loaded.failed || !loaded.value)
    return (
      <DropdownMenuLabel className="flex items-center gap-1 text-muted-foreground">
        Couldn&rsquo;t load <ErrorAlchemyMenu error={loaded.error} operation={`Open ${segment.label || "Untitled"}`} />
      </DropdownMenuLabel>
    );
  const { heading, items } = loaded.value;
  const { shown, more } = capSiblings(items);
  const list = searching ? filterItems(items, query) : shown;
  return (
    <>
      <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">{heading}</DropdownMenuLabel>
      {searching ? (
        <div className="px-1 pb-1">
          <SearchField
            className="w-full"
            autoFocus
            value={query}
            placeholder="Search"
            onChange={(e) => setQuery(e.target.value)}
            // The menu's type-ahead would take every letter; only the keys that move between rows pass.
            onKeyDown={(e) => {
              if (e.key !== "Escape" && e.key !== "ArrowDown" && e.key !== "ArrowUp") e.stopPropagation();
            }}
          />
        </div>
      ) : null}
      {list.map((item) => (
        <TierRow key={item.id} item={item} depth={1} childCache={childCache} loadChildren={loadChildren} />
      ))}
      {searching && list.length === 0 ? <DropdownMenuLabel className="font-normal text-muted-foreground">No matches</DropdownMenuLabel> : null}
      {!searching && more > 0 ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-tiered-more=""
            onSelect={(e) => {
              e.preventDefault();
              onSearch();
            }}
          >
            <Search size={15} className="text-muted-foreground" />
            <span>{more} more</span>
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
}

/** One row in any tier: a link, and when it has a next tier, a hover submenu beside it. */
function TierRow({
  item,
  depth,
  childCache,
  loadChildren,
}: {
  item: TieredItem;
  depth: 1 | 2 | 3;
  childCache: Cache<readonly TieredItem[]>;
  loadChildren: TieredChildrenLoader | undefined;
}) {
  const go = useGo();
  const face = (
    <>
      <ItemIcon item={item} fallback={TIER_ICON[depth - 1]} />
      <span className={cn("min-w-0 flex-1 truncate", item.current && "font-medium")}>{item.label || "Untitled"}</span>
    </>
  );
  if (depth === 3 || !hasNextTier(item, depth === 1 ? loadChildren : undefined)) {
    return (
      <DropdownMenuItem className="gap-2" data-tiered-row={item.id} data-current={item.current ? "true" : undefined} onSelect={() => go(item.href)}>
        {face}
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className="gap-2"
        data-tiered-row={item.id}
        data-current={item.current ? "true" : undefined}
        // The row is a link: a click or Enter goes there; hover and → open what it holds.
        onClick={() => go(item.href)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go(item.href);
          }
        }}
      >
        {face}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64" data-tiered-tier={String(depth + 1)}>
        <ChildrenTier item={item} depth={depth} childCache={childCache} loadChildren={loadChildren} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function ChildrenTier({
  item,
  depth,
  childCache,
  loadChildren,
}: {
  item: TieredItem;
  depth: 1 | 2;
  childCache: Cache<readonly TieredItem[]>;
  loadChildren: TieredChildrenLoader | undefined;
}) {
  const known = item.children;
  const empty = useContext(EmptyChildren);
  const loaded = useLoad(childCache, item.id, known || !loadChildren ? null : () => loadChildren(item));
  const children = known ?? loaded?.value;
  if (!children) {
    if (loaded?.failed)
      return (
        <DropdownMenuLabel className="flex items-center gap-1 font-normal text-muted-foreground">
          Couldn&rsquo;t load <ErrorAlchemyMenu error={loaded.error} operation={`Open ${item.label || "Untitled"}`} />
        </DropdownMenuLabel>
      );
    return <RegionSkeleton shape="rows" count={2} aria-label="Loading" />;
  }
  if (children.length === 0) return <DropdownMenuLabel className="font-normal text-muted-foreground">{depth === 1 ? empty : "No views"}</DropdownMenuLabel>;
  return (
    <>
      {children.map((child) => (
        <TierRow key={child.id} item={child} depth={(depth + 1) as 2 | 3} childCache={childCache} loadChildren={loadChildren} />
      ))}
    </>
  );
}

// ── Phone: one bottom sheet, drilled in ───────────────────────────────────────────────────────

interface Level {
  title: string;
  item: TieredItem | null;
  depth: 0 | 1 | 2;
}

function SegmentSheet({ segment, current, siblingCache, childCache, loadChildren, className }: SegmentProps) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<Level[]>([]);
  const go = useGo();
  const top = stack[stack.length - 1];
  return (
    <>
      <button
        type="button"
        className={cn("min-w-0", className)}
        data-current={current ? "true" : undefined}
        data-tiered-segment={segment.id}
        aria-haspopup="dialog"
        onClick={() => {
          setStack([{ title: segment.label || "Untitled", item: null, depth: 0 }]);
          setOpen(true);
        }}
      >
        <SegmentFace segment={segment} />
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title={top?.title ?? segment.label} size="full">
        <BottomSheetHeader title={top?.title ?? segment.label} showBack={stack.length > 1} onBack={() => setStack((s) => s.slice(0, -1))} />
        <BottomSheetBody className="px-2">
          {top ? (
            <SheetLevel
              key={stack.length}
              level={top}
              segment={segment}
              siblingCache={siblingCache}
              childCache={childCache}
              loadChildren={loadChildren}
              onGo={(href) => {
                // Navigate first: closing the sheet first let a quick tap's navigation be dropped (walk, 2026-10-14).
                go(href);
                setOpen(false);
              }}
              onDrill={(item) => setStack((s) => [...s, { title: item.label || "Untitled", item, depth: (top.depth + 1) as 1 | 2 }])}
            />
          ) : null}
        </BottomSheetBody>
      </BottomSheet>
    </>
  );
}

function SheetLevel({
  level,
  segment,
  siblingCache,
  childCache,
  loadChildren,
  onGo,
  onDrill,
}: {
  level: Level;
  segment: TieredSegment;
  siblingCache: Cache<TieredSiblings>;
  childCache: Cache<readonly TieredItem[]>;
  loadChildren: TieredChildrenLoader | undefined;
  onGo: (href: string) => void;
  onDrill: (item: TieredItem) => void;
}) {
  const siblings = useLoad(siblingCache, segment.id, level.depth === 0 ? (segment.siblings ?? null) : null);
  const item = level.item;
  const children = useLoad(childCache, item?.id ?? "", item && !item.children && loadChildren && level.depth === 1 ? () => loadChildren(item) : null);
  const [query, setQuery] = useState("");
  const empty = useContext(EmptyChildren);
  const all: readonly TieredItem[] | undefined = level.depth === 0 ? siblings?.value?.items : (item?.children ?? children?.value);
  const failure = level.depth === 0 ? siblings : children;
  if (!all)
    return failure?.failed ? (
      <p className="flex items-center gap-1 px-2 py-3 text-sm text-muted-foreground">
        Couldn&rsquo;t load <ErrorAlchemyMenu error={failure.error} operation={`Open ${level.title}`} />
      </p>
    ) : (
      <RegionSkeleton shape="rows" count={4} aria-label="Loading" />
    );
  const searchable = level.depth === 0 && all.length > SIBLINGS_SHOWN;
  const list = searchable ? filterItems(all, query) : all;
  const rowDepth = (level.depth + 1) as 1 | 2 | 3;
  return (
    <div className="flex flex-col gap-0.5" data-tiered-tier={String(rowDepth)}>
      {level.depth === 0 && siblings?.value ? <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{siblings.value.heading}</p> : null}
      {searchable ? (
        <div className="px-1 pb-2">
          <SearchField value={query} placeholder="Search" onChange={(e) => setQuery(e.target.value)} />
        </div>
      ) : null}
      {list.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">{level.depth === 0 ? "No matches" : level.depth === 1 ? empty : "No views"}</p> : null}
      {list.map((row) => {
        const deeper = rowDepth < 3 && hasNextTier(row, rowDepth === 1 ? loadChildren : undefined);
        return (
          <div key={row.id} className="flex min-h-11 items-center rounded-md" data-tiered-row={row.id}>
            <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm" onClick={() => onGo(row.href)}>
              <ItemIcon item={row} fallback={TIER_ICON[rowDepth - 1]} />
              <span className={cn("truncate", row.current && "font-medium")}>{row.label || "Untitled"}</span>
            </button>
            {deeper ? (
              <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground" aria-label={`Open ${row.label || "Untitled"}`} onClick={() => onDrill(row)}>
                <ChevronRight size={18} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
