/**
 * The L1 "structure" kit (`engine/lod.ts` `DetailLevel`): the pieces every item type's skeleton is built
 * from — calm placeholder bars where text was, plus the component's chrome (inputs, avatars, grid lines,
 * icons, colors). Pure layout: no store, no data, no effects, so a board of 100 skeletons costs only paint.
 *
 * Sizes are in `--lod-u` (`board-lod.css`): one world px while the tile is still at its legible size, a
 * fixed SCREEN size below it. At the L0→L1 threshold a skeleton is exactly the component's own layout (no
 * jump); as you zoom out further its bars keep their size and fewer rows fit — a calmer view, never specks.
 */

import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** `n` structure units as a CSS length. */
export const u = (n: number): string => `calc(${n} * var(--lod-u, 1px))`;

/** The type's color at an alpha (its avatars, bubbles, buttons). */
export const accentFill = (alpha: number): string => `hsl(var(--tile-accent) / ${alpha})`;

/** A text placeholder: one line's worth, as wide as the words it stands for. */
export function Bar({
  w = "100%",
  h = 8,
  strong = false,
  accent = false,
  className,
  style,
}: {
  w?: string | number;
  /** Height in units (a 14 px line of text ≈ 8). */
  h?: number;
  /** A heading or a title: drawn in the border token (one step firmer than muted, never an in-between gray). */
  strong?: boolean;
  /** Drawn in the type's color (a link, a selected tab). */
  accent?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn("shrink-0 rounded-full", !accent && (strong ? "bg-border" : "bg-muted"), className)}
      style={{ width: typeof w === "number" ? u(w) : w, height: u(h), ...(accent ? { background: accentFill(0.35) } : null), ...style }}
    />
  );
}

/** A paragraph: `widths` are each line's share of the column; the last line runs short like real prose. */
export function Lines({ widths = ["100%", "96%", "88%", "62%"], gap = 9, h = 8 }: { widths?: readonly string[]; gap?: number; h?: number }) {
  return (
    <div className="flex flex-col" style={{ gap: u(gap) }}>
      {widths.map((w, i) => (
        <Bar key={i} w={w} h={h} />
      ))}
    </div>
  );
}

/** An avatar, a participant, a step dot. */
export function Dot({ size = 24, accent = true, children }: { size?: number; accent?: boolean; children?: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full", !accent && "bg-muted")}
      style={{ width: u(size), height: u(size), ...(accent ? { background: accentFill(0.22) } : null) }}
    >
      {children}
    </div>
  );
}

/** An icon the component shows, at the size it shows it (icons are kept at every level). */
export function Glyph({ icon: Icon, size = 16, accent = false }: { icon: LucideIcon; size?: number; accent?: boolean }) {
  return (
    <Icon
      aria-hidden
      className={cn("shrink-0", accent ? "text-[hsl(var(--tile-accent))]" : "text-muted-foreground")}
      style={{ width: u(size), height: u(size) }}
    />
  );
}

/** A field or a composer: the box with a placeholder inside, optional round action at its end. */
export function Field({ h = 36, action = false, barW = "45%", className }: { h?: number; action?: boolean; barW?: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex shrink-0 items-center rounded-lg border border-border bg-background", className)}
      style={{ height: u(h), paddingInline: u(10), gap: u(8), borderWidth: u(1) }}
    >
      <Bar w={barW} h={7} />
      {action && <div className="ml-auto shrink-0 rounded-full" style={{ width: u(h - 12), height: u(h - 12), background: accentFill(0.85) }} />}
    </div>
  );
}

/** A button or a chip: a rounded pill. `solid` is the primary action (the type's color). */
export function Pill({ w = 56, h = 20, solid = false }: { w?: number; h?: number; solid?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn("shrink-0 rounded-full", !solid && "border border-border bg-background")}
      style={{ width: u(w), height: u(h), ...(solid ? { background: accentFill(0.85) } : { borderWidth: u(1) }) }}
    />
  );
}

/** A picture's place: a muted frame with the kind of picture it is. */
export function Media({ icon, ratio, grow = false, className }: { icon?: LucideIcon; ratio?: string; grow?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted", grow && "min-h-0 flex-1", className)}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      {icon && <Glyph icon={icon} size={28} />}
    </div>
  );
}

/** A horizontal run of pieces. */
export function Row({ children, gap = 8, className, style }: { children: ReactNode; gap?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("flex min-w-0 shrink-0 items-center", className)} style={{ gap: u(gap), ...style }}>
      {children}
    </div>
  );
}

/** A vertical stack (the body's own column). */
export function Stack({ children, gap = 12, className, style }: { children: ReactNode; gap?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)} style={{ gap: u(gap), ...style }}>
      {children}
    </div>
  );
}

/** A divider line (grid lines, a toolbar's edge). */
export function Rule({ vertical = false }: { vertical?: boolean }) {
  return <div aria-hidden className="shrink-0 bg-border" style={vertical ? { width: u(1), alignSelf: "stretch" } : { height: u(1), width: "100%" }} />;
}

/** The body's padding box: everything a structure draws sits inside it. Rows that do not fit are cut whole. */
export function Pad({ children, x = 16, y = 14, className, end = false }: { children: ReactNode; x?: number; y?: number; className?: string; end?: boolean }) {
  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", end && "justify-end", className)}
      style={{ paddingInline: u(x), paddingBlock: u(y), gap: u(12) }}
    >
      {children}
    </div>
  );
}
