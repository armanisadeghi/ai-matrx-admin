"use client";

// THE APP GRID — the 9-dot button and its popover, built tight like Google's apps popover
// (owner, 2026-10-20 fourth round): the favorites in a rounded card on top, then every other
// product in ONE grid in family order. It never scrolls at common heights (owner, 2026-10-22:
// scrolling the grid is "ridiculous"): a 26rem popover, 5 columns, 72px cells, and on a short
// screen 60px cells (6 columns below 600px) — `gridLayout`; the body may use all the room under
// the button, so only a very short screen scrolls. No heading rows, and nothing appears twice: a favorite is not
// repeated below. A tile ALWAYS opens its product in a new tab (owner, 2026-10-17). The grid is
// ONE Tab stop (roving tabindex); arrows move between tiles by position. Grid A is the owner's
// pick (2026-10-21), with a search field on top: it filters the tiles as you type (names plus
// their sections and pages), Enter opens the first match, ArrowDown moves into the tiles, Esc
// clears the field and, when it is already empty, closes (Radix).
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Grip, Pencil, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, SearchField } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { ProductMark } from "./ProductMark";
import type { FrameProduct, ProductFamily } from "./types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { rankMenuSearch } from "./searchEngine";
import type { GoToEntry } from "./goToIndex";

export interface AppGridProps {
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  favorites: readonly string[];
  onFavoritesChange: (ids: string[]) => void;
  /** The product the frame is showing — marked in the grid. */
  currentProductId?: string;
  /** The host's own menu entries, searched with every page (the same index as "Go to"). */
  goToEntries?: readonly GoToEntry[];
  /** Same-tab navigation for a page hit (the host's router). Without it the grid assigns the location. */
  onGo?: (href: string) => void;
}

/** Page hits listed under the matching tiles. */
const GRID_PAGE_HITS_MAX = 8;

/** The card holds at most this many favorites. */
export const GRID_FAVORITES_MAX = 9;

/** Cell heights: tall screens, then short ones (under 760px). */
export const GRID_TILE_TALL_PX = 72;
export const GRID_TILE_SHORT_PX = 60;
/** The body's chrome around the tiles: card padding, the gap, the "Edit grid" row, body padding. */
const GRID_BODY_CHROME_PX = 8 + 4 + 36 + 16;

/** The grid's shape for a screen height: columns, cell height and the body's natural height. */
export function gridLayout(viewportHeight: number, favoriteCount: number, restCount: number) {
  const columns = viewportHeight < 600 ? 6 : 5;
  const tile = viewportHeight < 760 ? GRID_TILE_SHORT_PX : GRID_TILE_TALL_PX;
  const rows = Math.ceil(favoriteCount / columns) + Math.ceil(restCount / columns);
  return { columns, tile, bodyHeight: rows * tile + GRID_BODY_CHROME_PX };
}

const TILE_SELECTOR = "[data-mf-tile]";

/** Move focus to the nearest tile in the arrow's direction, by on-screen position. */
function moveByArrow(container: HTMLElement, from: HTMLElement, key: string): boolean {
  const tiles = Array.from(container.querySelectorAll<HTMLElement>(TILE_SELECTOR));
  const index = tiles.indexOf(from);
  if (index < 0) return false;
  if (key === "Home") return focusTile(tiles[0]);
  if (key === "End") return focusTile(tiles[tiles.length - 1]);
  if (key === "ArrowRight") return focusTile(tiles[index + 1]);
  if (key === "ArrowLeft") return focusTile(tiles[index - 1]);
  if (key !== "ArrowDown" && key !== "ArrowUp") return false;
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  let best: HTMLElement | undefined;
  let bestScore = Infinity;
  for (const t of tiles) {
    if (t === from) continue;
    const b = t.getBoundingClientRect();
    const dy = key === "ArrowDown" ? b.top - a.top : a.top - b.top;
    if (dy < 4) continue;
    const score = dy * 1000 + Math.abs(b.left + b.width / 2 - ax);
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return focusTile(best);
}

function focusTile(el: HTMLElement | undefined): boolean {
  if (!el) return false;
  el.focus();
  el.scrollIntoView({ block: "nearest" });
  return true;
}

export function AppGrid({
  products,
  families,
  favorites,
  onFavoritesChange,
  currentProductId,
  goToEntries,
  onGo,
}: AppGridProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rovingKey, setRovingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Read when the popover opens: the grid's shape follows the screen's height.
  const [viewportHeight, setViewportHeight] = useState(900);
  const bodyRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // THE SAME FULL INDEX AS "GO TO" (every page with a home, the menus), loaded on the first keystroke.
  const [pageIndex, setPageIndex] = useState<GoToEntry[] | null>(null);
  const indexRequested = useRef(false);

  const favoriteProducts = favorites
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is FrameProduct => Boolean(p))
    .slice(0, GRID_FAVORITES_MAX);
  const favoriteIds = new Set(favoriteProducts.map((p) => p.id));
  // Every other product once, in family order (editing: every product, so each can be starred).
  const rest = families.flatMap((f) => products.filter((p) => p.family === f.id && !favoriteIds.has(p.id)));
  const full = favoriteProducts.length >= GRID_FAVORITES_MAX;
  // Searching: one flat list of matches, best first (editing ignores the search).
  const searching = query.trim().length > 0 && !editing;
  const matches = searching ? matchProducts(products, families, query) : [];
  const pageHits =
    searching && pageIndex
      ? rankMenuSearch(pageIndex, query.trim(), GRID_PAGE_HITS_MAX * 3)
          .filter((e) => !e.id.startsWith("product:"))
          .slice(0, GRID_PAGE_HITS_MAX)
      : [];

  function onQueryChange(next: string) {
    setQuery(next);
    if (next.trim() && !indexRequested.current) {
      indexRequested.current = true;
      void import("./goToSearchIndex").then((m) => setPageIndex(m.fullGoToIndex(products, families, goToEntries)));
    }
  }

  function goToPage(href: string, newTab: boolean) {
    setOpen(false);
    if (newTab) openOutbound(href, "_blank", "noopener,noreferrer");
    else if (onGo) onGo(href);
    else window.location.assign(href);
  }
  const layout = gridLayout(viewportHeight, favoriteProducts.length, rest.length);
  const cols = layout.columns === 6 ? "grid-cols-6" : "grid-cols-5";

  // Edits start from the favorites that resolve to a product, so a retired id never lingers.
  function toggleFavorite(id: string) {
    const current = favoriteProducts.map((p) => p.id);
    if (current.includes(id)) onFavoritesChange(current.filter((f) => f !== id));
    else if (!full) onFavoritesChange([...current, id]);
  }

  function moveFavorite(id: string, by: -1 | 1) {
    const current = favoriteProducts.map((p) => p.id);
    const from = current.indexOf(id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= current.length) return;
    current.splice(to, 0, current.splice(from, 1)[0]);
    onFavoritesChange(current);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const first = matches[0];
      const page = pageHits[0];
      if (!first && !page) return;
      e.preventDefault();
      if (first) {
        openOutbound(first.homeHref, "_blank", "noopener,noreferrer");
        setOpen(false);
      } else goToPage(page.href, e.metaKey || e.ctrlKey);
    } else if (e.key === "ArrowDown") {
      const first = bodyRef.current?.querySelector<HTMLElement>(TILE_SELECTOR);
      if (first) {
        e.preventDefault();
        focusTile(first);
      }
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (!target.matches(TILE_SELECTOR) || !bodyRef.current) return;
    if (moveByArrow(bodyRef.current, target, e.key)) e.preventDefault();
  }

  // The keyboard's tile order: the matches while searching, else the favorites card, then the list.
  const navKeys = searching
    ? matches.map((p) => `hit-${p.id}`)
    : [...favoriteProducts.map((p) => `fav-${p.id}`), ...rest.map((p) => `all-${p.id}`)];
  const activeKey = rovingKey && navKeys.includes(rovingKey) ? rovingKey : navKeys[0];

  function renderTile(product: FrameProduct, group: string) {
    const isFavorite = favoriteIds.has(product.id);
    const key = `${group}-${product.id}`;
    const navigable = navKeys.includes(key);
    const keyboard = {
      // Only navigable tiles join arrow movement; only the active one is a Tab stop.
      ...(navigable ? { "data-mf-tile": "" } : {}),
      tabIndex: key === activeKey ? 0 : -1,
      onFocus: () => navigable && setRovingKey(key),
    };
    const glyph = <ProductMark product={product} size="grid" />;
    const label = <span className="mf-grid-name w-full truncate text-center">{product.name}</span>;
    const tileClass = cn(
      "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1",
      "outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
    );
    if (editing) {
      const index = favoriteProducts.findIndex((p) => p.id === product.id);
      const toggle = (
        <button
          type="button"
          {...keyboard}
          aria-pressed={isFavorite}
          disabled={!isFavorite && full}
          aria-label={`${isFavorite ? "Remove" : "Add"} ${product.name} ${isFavorite ? "from" : "to"} favorites`}
          className={cn(tileClass, "w-full")}
          style={{ height: layout.tile }}
          onClick={() => toggleFavorite(product.id)}
        >
          {glyph}
          {label}
          <Star
            aria-hidden
            className={cn(
              "absolute top-1.5 right-1.5 size-3",
              isFavorite ? "fill-current text-foreground" : "text-muted-foreground",
            )}
          />
        </button>
      );
      return (
        <div key={key} className="relative min-w-0">
          {toggle}
          {isFavorite ? (
            <>
              <button
                type="button"
                aria-label={`Move ${product.name} earlier`}
                disabled={index <= 0}
                className="absolute top-1.5 left-1 rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-0"
                onClick={() => moveFavorite(product.id, -1)}
              >
                <ChevronLeft aria-hidden className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Move ${product.name} later`}
                disabled={index >= favoriteProducts.length - 1}
                className="absolute top-1.5 left-5 rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-0"
                onClick={() => moveFavorite(product.id, 1)}
              >
                <ChevronRight aria-hidden className="size-3.5" />
              </button>
            </>
          ) : null}
        </div>
      );
    }
    return (
      <OutboundLink
        key={key}
        href={product.homeHref}
        {...keyboard}
        aria-current={product.id === currentProductId ? "page" : undefined}
        className={cn(tileClass, product.id === currentProductId && "bg-accent")}
        style={{ height: layout.tile }}
        onClick={() => setOpen(false)}
      >
        {glyph}
        {label}
        <span className="sr-only">(opens in a new tab)</span>
      </OutboundLink>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewportHeight(window.innerHeight);
        if (!next) {
          setEditing(false);
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={<Grip />} aria-label="All products" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        width="xl"
        padding="none"
        surface="solid"
        // First Esc clears the search; the next one (empty field) closes.
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
            placeholder="Search products"
            aria-label="Search products"
          />
        </div>
        <div
          ref={bodyRef}
          role="group"
          aria-label="Products"
          onKeyDown={onKeyDown}
          className="mf-grid-scroll overflow-y-auto overscroll-contain p-2"
        >
          {searching ? (
            matches.length > 0 || pageHits.length > 0 ? (
              <>
                {matches.length > 0 ? (
                  <section aria-label="Matching products" className={cn("grid", cols)}>
                    {matches.map((p) => renderTile(p, "hit"))}
                  </section>
                ) : null}
                {pageHits.length > 0 ? (
                  <section aria-label="Matching pages" className="flex flex-col pt-1">
                    {pageHits.map((hit) => (
                      <a
                        key={hit.id}
                        href={hit.href}
                        data-clickable
                        data-mf-page-hit=""
                        className="flex min-w-0 items-baseline gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-accent focus-visible:bg-accent"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(hit.href, e.metaKey || e.ctrlKey);
                        }}
                      >
                        <span className="shrink-0 truncate text-sm text-foreground">{hit.label}</span>
                        {hit.trail.length > 0 ? (
                          <span className="min-w-0 truncate type-secondary text-muted-foreground">{hit.trail.join(" › ")}</span>
                        ) : null}
                      </a>
                    ))}
                  </section>
                ) : null}
              </>
            ) : (
              <p role="status" className="type-secondary px-2 py-6 text-center text-muted-foreground">
                {pageIndex ? "Nothing matches" : "Searching…"}
              </p>
            )
          ) : (
            <>
              {favoriteProducts.length > 0 ? (
                <section aria-label={editing ? "Your favorites, in order" : "Your favorites"} className={cn("mf-grid-card grid p-1", cols)}>
                  {favoriteProducts.map((p) => renderTile(p, "fav"))}
                </section>
              ) : null}
              <section aria-label={editing ? "Add favorites" : "All products"} className="pt-1">
                <div className={cn("grid", cols)}>{rest.map((p) => renderTile(p, "all"))}</div>
              </section>
            </>
          )}
          <div className="flex justify-center pt-1">
            <Button variant="quiet" icon={editing ? <Check /> : <Pencil />} onClick={() => setEditing((v) => !v)}>
              {editing ? "Done" : "Edit grid"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The products matching `query` — by name, family, section or page — best first. */
function matchProducts(
  products: readonly FrameProduct[],
  families: readonly { id: ProductFamily; label: string }[],
  query: string,
): FrameProduct[] {
  const familyLabel = new Map(families.map((f) => [f.id, f.label]));
  const byId = new Map(products.map((p) => [p.id, p]));
  const entries = products.map((p) => ({
    id: p.id,
    label: p.name,
    trail: [],
    href: p.homeHref,
    keywords: [familyLabel.get(p.family) ?? "", ...p.menu.flatMap((s) => [s.label ?? "", ...s.items.map((i) => i.label)])].filter(Boolean),
  }));
  return rankMenuSearch(entries, query, products.length).map((e) => byId.get(e.id)!);
}
