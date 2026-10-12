"use client";

/**
 * A deck's first slide as a picture (home cards, template tiles): the real renderer on paper,
 * scaled to the box. An empty deck shows its blank first page, never a generic icon.
 */

import { cn } from "@/lib/utils";
import { normalizeDeck } from "../deck-model";
import { PaperSlide } from "../slide-paper";

export function DeckFirstSlide({ deck, className }: { deck: unknown; className?: string }) {
  const d = normalizeDeck(deck);
  return (
    <div className={cn("bg-white", className)} aria-hidden>
      <PaperSlide deck={d} slide={d.slides[0]} className="h-full w-full" />
    </div>
  );
}
