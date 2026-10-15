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
import { slideSizeOf, slideStage } from "@/components/mardown-display/blocks/presentations/slide-size";
import { deckFontFamily, resolveDeckTheme } from "@/components/mardown-display/blocks/presentations/presets";
import { hexToHslTriplet, slideSurfaceStyle } from "@/components/mardown-display/blocks/presentations/slide-surface";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { cn } from "@/lib/utils";
import type { Deck, DeckSlide } from "./deck-model";
import { slideBackgroundOf, slideTextStyleOf, type TextStyle } from "./deck-slide-ops";

/** The CSS variables (and colour scheme) that pin a deck's surface for everything inside a slide. */
export function slidePaperStyle(deck: Pick<Deck, "theme">): CSSProperties {
  return slideSurfaceStyle(resolveDeckTheme(deck.theme ?? undefined));
}

export function deckLook(deck: Pick<Deck, "theme">) {
  const theme = resolveDeckTheme(deck.theme ?? undefined);
  const variant: SlideVariant = (theme.variant as SlideVariant) || "fancy";
  return { theme, variant, fontFamily: deckFontFamily(theme.font) };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** The CSS that makes Format → Text on a slide's layout text win over the layout's own classes. */
export function slideTextFormatCss(style: TextStyle): string {
  const rules: string[] = [];
  if (style.bold !== undefined) rules.push(`font-weight:${style.bold ? 700 : 400} !important`);
  if (style.italic !== undefined) rules.push(`font-style:${style.italic ? "italic" : "normal"} !important`);
  if (style.underline) rules.push("text-decoration:underline !important");
  if (style.color && HEX.test(style.color)) rules.push(`color:${style.color} !important`, `-webkit-text-fill-color:${style.color} !important`, "background-image:none !important");
  if (style.align) rules.push(`text-align:${style.align} !important`);
  if (style.lineHeight) rules.push(`line-height:${style.lineHeight} !important`);
  if (style.scale && style.scale !== 1) rules.push(`zoom:${style.scale}`);
  if (rules.length === 0) return "";
  return `[data-slide-fmt] :is(h1,h2,h3,h4,p,li,blockquote,figcaption){${rules.join(";")}}`;
}

/** One slide on its stage (960×540 widescreen, or the deck's own slide size), scaled to the box the parent gives (`className`). */
export function PaperSlide({
  deck,
  slide,
  slideNumber,
  className,
  // The stage is fixed per deck, so "full screen" type IS the slide's real size: the editor, the
  // rail, the cards and Present all show the same slide (WYSIWYG), only scaled.
  fullScreen = true,
  children,
}: {
  deck: Pick<Deck, "theme" | "slideSize"> & { showSlideNumbers?: boolean };
  slide: DeckSlide | undefined;
  /** 1-based position of the slide, shown when the deck asks for slide numbers. */
  slideNumber?: number;
  className?: string;
  fullScreen?: boolean;
  /** Drawn over the slide (inside the stage), e.g. the editor's in-place fields live in SlideView itself. */
  children?: ReactNode;
}) {
  const { theme, variant, fontFamily } = deckLook(deck);
  const bg = slideBackgroundOf(slide);
  const fmt = slideTextFormatCss(slideTextStyleOf(slide));
  const colorTokens: Record<string, string> =
    bg?.color && HEX.test(bg.color) ? { "--card": hexToHslTriplet(bg.color), "--background": hexToHslTriplet(bg.color) } : {};
  return (
    <ScaledSlide className={cn("bg-transparent", className)} stage={slideStage(slideSizeOf(deck))}>
      <div
        className={cn("relative h-full w-full", bg?.image && "[&_.bg-card]:!bg-transparent")}
        style={{ ...slidePaperStyle(deck), ...(colorTokens as CSSProperties), fontFamily }}
        data-slide-fmt={fmt ? "" : undefined}
        data-slide-background={bg ? (bg.image ? "image" : "color") : undefined}
      >
        {fmt ? <style>{fmt}</style> : null}
        {bg?.image ? (
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <InlineMediaRef ref={bg.image} size="fill" fit="cover" fallback={null} />
          </div>
        ) : null}
        {slide ? (
          <SlideView slide={slide} theme={theme} variant={variant} fullScreen={fullScreen} />
        ) : (
          <div className="h-full w-full rounded-xl border border-border bg-card" />
        )}
        {deck.showSlideNumbers && slideNumber ? (
          <span className="pointer-events-none absolute bottom-3 right-5 z-20 text-sm tabular-nums text-muted-foreground" data-slide-number="">
            {slideNumber}
          </span>
        ) : null}
        {children}
      </div>
    </ScaledSlide>
  );
}
