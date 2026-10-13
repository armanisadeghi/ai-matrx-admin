/**
 * The surface a slide is drawn on — decided by the DECK's theme, never by the app's light/dark mode.
 * One pure resolver feeds every drawing path (editor canvas, rail, Present, home cards, share view,
 * PDF, HTML, PPTX), so a slide is the same colours wherever it appears.
 */

import type { CSSProperties } from "react";
import type { SlideTheme } from "./SlideView";

export type SlideSurfaceMode = "light" | "dark";

export interface SlideSurface {
  mode: SlideSurfaceMode;
  /** The slide's page colour (hex). */
  background: string;
  /** Body text on the page. */
  foreground: string;
  /** Quiet text (subtitles, captions). */
  mutedForeground: string;
  /** Tinted blocks on the page (bullet rows). */
  muted: string;
  border: string;
}

const LIGHT: SlideSurface = {
  mode: "light",
  background: "#FFFFFF",
  foreground: "#27272A",
  mutedForeground: "#52525B",
  muted: "#EBEBED",
  border: "#D8D8DD",
};

const DARK: SlideSurface = {
  mode: "dark",
  background: "#0B1020",
  foreground: "#E5E7EB",
  mutedForeground: "#9CA3AF",
  muted: "#1A2036",
  border: "#2B3350",
};

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** The surface a theme asks for: explicit `surface`, else the lightness of its `backgroundColor`, else light paper. */
export function slideSurface(theme: Pick<SlideTheme, "surface" | "backgroundColor"> | null | undefined): SlideSurface {
  const bg = theme?.backgroundColor;
  const lum = bg ? luminance(bg) : null;
  const mode: SlideSurfaceMode = theme?.surface ?? (lum !== null && lum < 0.4 ? "dark" : "light");
  const base = mode === "dark" ? DARK : LIGHT;
  // A custom background of the matching lightness is honoured; a mismatch (light colour on a dark
  // surface) would make the text unreadable, so the surface default wins.
  const custom = bg && lum !== null && (lum < 0.4) === (mode === "dark") ? bg.toUpperCase() : null;
  return custom ? { ...base, background: custom } : base;
}

/** "#RRGGBB" → the "H S% L%" triplet the app's colour tokens use. */
export function hexToHslTriplet(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** The semantic tokens SlideView reads, pinned to the surface (the editor canvas applies these as CSS variables). */
export function slideSurfaceTokens(s: SlideSurface): Record<string, string> {
  return {
    "--background": hexToHslTriplet(s.background),
    "--foreground": hexToHslTriplet(s.foreground),
    "--card": hexToHslTriplet(s.background),
    "--card-foreground": hexToHslTriplet(s.foreground),
    "--muted": hexToHslTriplet(s.muted),
    "--muted-foreground": hexToHslTriplet(s.mutedForeground),
    "--border": hexToHslTriplet(s.border),
  };
}

/** Inline style that pins the slide tokens for a resolved theme — put it on the element that wraps a SlideView. */
export function slideSurfaceStyle(theme: SlideTheme | null | undefined): CSSProperties {
  const surface = slideSurface(theme);
  return { ...slideSurfaceTokens(surface), colorScheme: surface.mode } as CSSProperties;
}
