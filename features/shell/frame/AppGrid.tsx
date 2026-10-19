"use client";

// THE APP GRID — the 9-dot button and its popover of product tiles, grouped by
// family, with an editable "Your favorites" group on top (Google's apps
// popover). A tile ALWAYS opens its product in a new tab (owner ruling,
// 2026-10-17). The grid is ONE Tab stop (roving tabindex); arrow keys move
// between tiles by position; Esc closes (Radix). A favorite appears once for
// the keyboard: its copy in its family list is mouse-only.
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, Grip, Pencil, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import type { FrameProduct, ProductFamily } from "./types";

export interface AppGridProps {
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  favorites: readonly string[];
  onFavoritesChange: (ids: string[]) => void;
  /** The product the frame is showing — marked in the grid. */
  currentProductId?: string;
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
}: AppGridProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rovingKey, setRovingKey] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const favoriteProducts = favorites
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is FrameProduct => Boolean(p));

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

  // The keyboard's tile order: favorites, then each family without its favorites.
  const navKeys = [
    ...favoriteProducts.map((p) => `fav-${p.id}`),
    ...families.flatMap((f) =>
      products
        .filter((p) => p.family === f.id && (editing || !favorites.includes(p.id)))
        .map((p) => `${f.id}-${p.id}`),
    ),
  ];
  const activeKey = rovingKey && navKeys.includes(rovingKey) ? rovingKey : navKeys[0];

  function renderTile(product: FrameProduct, group: string) {
    const Icon = product.icon;
    const isFavorite = favorites.includes(product.id);
    const key = `${group}-${product.id}`;
    const navigable = navKeys.includes(key);
    const keyboard = {
      // Only navigable tiles join arrow movement; only the active one is a Tab stop.
      ...(navigable ? { "data-mf-tile": "" } : {}),
      tabIndex: key === activeKey ? 0 : -1,
      onFocus: () => navigable && setRovingKey(key),
    };
    const glyph = (
      <span
        className="mf-glyph flex size-10 items-center justify-center rounded-xl"
        style={
          {
            "--mf-hue": `var(--matrx-chip-${product.color})`,
            "--mf-hue-ink": `var(--matrx-chip-${product.color}-ink)`,
          } as React.CSSProperties
        }
      >
        <Icon className="size-5" aria-hidden />
      </span>
    );
    const label = (
      <span className="type-secondary line-clamp-2 w-full text-center text-foreground">
        {product.name}
      </span>
    );
    const tileClass = cn(
      "relative flex min-h-22 flex-col items-center justify-start gap-1.5 rounded-lg px-1 pt-3 pb-2",
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
              "absolute top-1.5 right-1.5 size-3.5",
              isFavorite ? "fill-current text-foreground" : "text-muted-foreground",
            )}
          />
        </button>
      );
    }
    return (
      <a
        key={key}
        href={product.homeHref}
        target="_blank"
        rel="noopener noreferrer"
        {...keyboard}
        aria-current={product.id === currentProductId ? "page" : undefined}
        className={cn(tileClass, product.id === currentProductId && "bg-accent")}
        onClick={() => setOpen(false)}
      >
        {glyph}
        {label}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
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
        width="xl"
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
          <section aria-label="Your favorites" className="pb-2">
            <div className="flex h-8 items-center justify-between pl-2">
              <span className="type-label">Your favorites</span>
              <Button
                variant="quiet"
                icon={editing ? <Check /> : <Pencil />}
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Done" : "Edit"}
              </Button>
            </div>
            {favoriteProducts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                {favoriteProducts.map((p) => renderTile(p, "fav"))}
              </div>
            ) : (
              <p className="type-secondary px-2 py-3 text-muted-foreground">
                Press Edit, then star a product
              </p>
            )}
          </section>
          {families.map((family) => {
            const members = products.filter((p) => p.family === family.id);
            if (members.length === 0) return null;
            return (
              <section key={family.id} aria-label={family.label} className="mf-rule-t py-2">
                <div className="flex h-8 items-center pl-2">
                  <span className="type-label">{family.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                  {members.map((p) => renderTile(p, family.id))}
                </div>
              </section>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
