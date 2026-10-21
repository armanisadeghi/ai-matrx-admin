"use client";

// THE APP GRID — the 9-dot button and its popover, built tight like Google's apps popover
// (owner, 2026-10-20 fourth round): a 320px popover, 3 columns of 80px cells (a 32px glyph
// and a one-line name), the favorites in a rounded card on top, then every other product in
// ONE grid in family order. No heading rows, and nothing appears twice: a favorite is not
// repeated below. A tile ALWAYS opens its product in a new tab (owner, 2026-10-17). The grid is
// ONE Tab stop (roving tabindex); arrows move between tiles by position; Esc closes (Radix).
// `look` is the owner's bake-off (A plain, B family hairlines, C filled marks) until he picks.
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, Grip, Pencil, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { ProductMark } from "./ProductMark";
import type { FrameProduct, ProductFamily } from "./types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export interface AppGridProps {
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  favorites: readonly string[];
  onFavoritesChange: (ids: string[]) => void;
  /** The product the frame is showing — marked in the grid. */
  currentProductId?: string;
  /** PLAYGROUND BAKE-OFF ONLY (owner picks one, then this goes); default `A`. */
  look?: FrameGridLook;
}

/** A = Google's layout; B = A plus a hairline and a tiny family name between families; C = A with filled marks. */
export type FrameGridLook = "A" | "B" | "C";

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
  look = "A",
}: AppGridProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rovingKey, setRovingKey] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const favoriteProducts = favorites
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is FrameProduct => Boolean(p))
    .slice(0, GRID_FAVORITES_MAX);
  const favoriteIds = new Set(favoriteProducts.map((p) => p.id));
  // Every other product once, in family order (editing: every product, so each can be starred).
  const rest = families.flatMap((f) =>
    products.filter((p) => p.family === f.id && (editing || !favoriteIds.has(p.id))),
  );

  function toggleFavorite(id: string) {
    onFavoritesChange(
      favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id],
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (!target.matches(TILE_SELECTOR) || !bodyRef.current) return;
    if (moveByArrow(bodyRef.current, target, e.key)) e.preventDefault();
  }

  // The keyboard's tile order: the favorites card, then the list.
  const navKeys = [
    ...(editing ? [] : favoriteProducts.map((p) => `fav-${p.id}`)),
    ...rest.map((p) => `all-${p.id}`),
  ];
  const activeKey = rovingKey && navKeys.includes(rovingKey) ? rovingKey : navKeys[0];

  function renderTile(product: FrameProduct, group: string) {
    const isFavorite = favorites.includes(product.id);
    const key = `${group}-${product.id}`;
    const navigable = navKeys.includes(key);
    const keyboard = {
      // Only navigable tiles join arrow movement; only the active one is a Tab stop.
      ...(navigable ? { "data-mf-tile": "" } : {}),
      tabIndex: key === activeKey ? 0 : -1,
      onFocus: () => navigable && setRovingKey(key),
    };
    const glyph = <ProductMark product={product} size="grid" filled={look === "C"} />;
    const label = <span className="mf-grid-name w-full truncate text-center">{product.name}</span>;
    const tileClass = cn(
      "relative flex h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1",
      "outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
    );
    if (editing) {
      return (
        <button
          key={key}
          type="button"
          {...keyboard}
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? "Remove" : "Add"} ${product.name} ${isFavorite ? "from" : "to"} favorites`}
          className={tileClass}
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
        if (!next) setEditing(false);
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
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          bodyRef.current?.querySelector<HTMLElement>(`${TILE_SELECTOR}[tabindex="0"]`)?.focus();
        }}
      >
        <div
          ref={bodyRef}
          role="group"
          aria-label="Products"
          onKeyDown={onKeyDown}
          className="mf-grid-scroll overflow-y-auto overscroll-contain p-2"
        >
          {!editing && favoriteProducts.length > 0 ? (
            <section aria-label="Your favorites" className="mf-grid-card grid grid-cols-3 p-1">
              {favoriteProducts.map((p) => renderTile(p, "fav"))}
            </section>
          ) : null}
          <section aria-label={editing ? "Choose favorites" : "All products"} className="pt-1">
            {look === "B" && !editing ? (
              families.map((family) => {
                const members = rest.filter((p) => p.family === family.id);
                if (members.length === 0) return null;
                return (
                  <div key={family.id}>
                    <div className="mf-grid-divider" aria-hidden>
                      <span>{family.label}</span>
                    </div>
                    <div className="grid grid-cols-3">{members.map((p) => renderTile(p, "all"))}</div>
                  </div>
                );
              })
            ) : (
              <div className="grid grid-cols-3">{rest.map((p) => renderTile(p, "all"))}</div>
            )}
          </section>
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
