"use client";

/**
 * A slide is paper: it draws with the light palette in both app themes (Google Slides keeps the
 * canvas white in dark mode), so a deck looks the same in the editor, the rail, the home's cards,
 * Present, and every export. SlideView reads semantic tokens (`bg-card`, `text-foreground`, …);
 * this pins those tokens to their light values for everything inside.
 */

import type { CSSProperties, ReactNode } from "react";
import { SlideView, type SlideVariant } from "@/components/mardown-display/blocks/presentations/SlideView";
import { ScaledSlide } from "@/components/mardown-display/blocks/presentations/ScaledSlide";
import { deckFontFamily, resolveDeckTheme } from "@/components/mardown-display/blocks/presentations/presets";
import { cn } from "@/lib/utils";
import type { Deck, DeckSlide } from "./deck-model";

export const SLIDE_PAPER_STYLE = {
  "--background": "240 5% 96%",
  "--foreground": "240 4% 16%",
  "--card": "0 0% 100%",
  "--card-foreground": "240 4% 16%",
  "--muted": "240 5% 92%",
  "--muted-foreground": "240 5% 35%",
  "--border": "240 6% 85%",
  colorScheme: "light",
} as CSSProperties;

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
  fullScreen = false,
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
      <div className="relative h-full w-full" style={{ ...SLIDE_PAPER_STYLE, fontFamily }}>
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
