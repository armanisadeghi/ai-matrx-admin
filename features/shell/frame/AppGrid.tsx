"use client";

// THE APP GRID — the 9-dot button and its popover, built tight like Google's apps popover
// (owner, 2026-10-20 fourth round): a 320px popover, 3 columns of 80px cells (a 32px glyph
// and a one-line name), the favorites in a rounded card on top, then every other product in
// ONE grid in family order. No heading rows, and nothing appears twice: a favorite is not
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

export interface AppGridProps {
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  favorites: readonly string[];
  onFavoritesChange: (ids: string[]) => void;
  /** The product the frame is showing — marked in the grid. */
  currentProductId?: string;
}

/** The card holds at most this many favorites (3 × 3, as Google's does). */
export const GRID_FAVORITES_MAX = 9;

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
}: AppGridProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rovingKey, setRovingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
      if (!first) return;
      e.preventDefault();
      openOutbound(first.homeHref, "_blank", "noopener,noreferrer");
      setOpen(false);
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
      "relative flex h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1",
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
        width="lg"
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
            onChange={(e) => setQuery(e.target.value)}
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
            matches.length > 0 ? (
              <section aria-label="Matching products" className="grid grid-cols-3">
                {matches.map((p) => renderTile(p, "hit"))}
              </section>
            ) : (
              <p role="status" className="type-secondary px-2 py-6 text-center text-muted-foreground">
                No product matches
              </p>
            )
          ) : (
            <>
              {favoriteProducts.length > 0 ? (
                <section aria-label={editing ? "Your favorites, in order" : "Your favorites"} className="mf-grid-card grid grid-cols-3 p-1">
                  {favoriteProducts.map((p) => renderTile(p, "fav"))}
                </section>
              ) : null}
              <section aria-label={editing ? "Add favorites" : "All products"} className="pt-1">
                <div className="grid grid-cols-3">{rest.map((p) => renderTile(p, "all"))}</div>
              </section>
            </>
          )}
          <div className="flex justify-center pt-1">
            <Button variant="quiet" icon={editing ? <Check /> : <Pencil />} onClick={() => setEditing((v) => !v)}>
              {editing ? "Done" : "Edit favorites"}
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
