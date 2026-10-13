"use client";

/**
 * A slide draws on the page its DECK's theme asks for (light paper by default, a dark page for dark
 * themes like Midnight) in both app modes — never on the app's own light/dark colours. SlideView reads
 * semantic tokens (`bg-card`, `text-foreground`, …); the surface resolver pins those tokens for
 * everything inside, and the exports read the same resolver, so the editor canvas, rail, Present, home
 * cards, share view and every download agree.
 */

import type { CSSProperties, ReactNode } from "react";
import { SlideView, type SlideVariant } from "@/components/mardown-display/blocks/presentations/SlideView";
import { ScaledSlide } from "@/components/mardown-display/blocks/presentations/ScaledSlide";
import { deckFontFamily, resolveDeckTheme } from "@/components/mardown-display/blocks/presentations/presets";
import { slideSurfaceStyle } from "@/components/mardown-display/blocks/presentations/slide-surface";
import { cn } from "@/lib/utils";
import type { Deck, DeckSlide } from "./deck-model";

/** The CSS variables (and colour scheme) that pin a deck's surface for everything inside a slide. */
export function slidePaperStyle(deck: Pick<Deck, "theme">): CSSProperties {
  return slideSurfaceStyle(resolveDeckTheme(deck.theme ?? undefined));
}

export function deckLook(deck: Pick<Deck, "theme">) {
  const theme = resolveDeckTheme(deck.theme ?? undefined);
  const variant: SlideVariant = (theme.variant as SlideVariant) || "fancy";
  return { theme, variant, fontFamily: deckFontFamily(theme.font) };
}

/** One slide on its 960×540 stage, scaled to the box the parent gives (`className`). */
export function PaperSlide({
  deck,
  slide,
  className,
  // The stage is always 960×540, so "full screen" type IS the slide's real size: the editor, the
  // rail, the cards and Present all show the same slide (WYSIWYG), only scaled.
  fullScreen = true,
  children,
}: {
  deck: Pick<Deck, "theme">;
  slide: DeckSlide | undefined;
  className?: string;
  fullScreen?: boolean;
  /** Drawn over the slide (inside the stage), e.g. the editor's in-place fields live in SlideView itself. */
  children?: ReactNode;
}) {
  const { theme, variant, fontFamily } = deckLook(deck);
  return (
    <ScaledSlide className={cn("bg-transparent", className)}>
      <div className="relative h-full w-full" style={{ ...slidePaperStyle(deck), fontFamily }}>
        {slide ? (
          <SlideView slide={slide} theme={theme} variant={variant} fullScreen={fullScreen} />
        ) : (
          <div className="h-full w-full rounded-xl border border-border bg-card" />
        )}
        {children}
      </div>
    </ScaledSlide>
  );
}
