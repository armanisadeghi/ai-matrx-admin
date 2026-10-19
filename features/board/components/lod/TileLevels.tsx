"use client";

/**
 * A tile's faces below full detail (`engine/lod.ts` `DetailLevel`), drawn OVER the card while the
 * feature body is hidden (or was never mounted):
 *
 *   L1 `StructureFace` — the tile's own chrome (header: icon + title) over the type's skeleton
 *                        (`BoardItemType.structure`, else `GenericStructure`).
 *   L2 the far-zoom card (`TileFace.tsx` `OverviewCard`).
 *   L3 `LabelFace`     — type icon + title, nothing else, as large as the tile allows.
 *
 * `LevelLayers` cross-fades between them on the motion tokens (`board-lod.css`). Full → structure is
 * a cut, not a fade: at that threshold the skeleton has the component's exact layout, so the words
 * turn into bars in place. Every face is pure props: no store reads, no data, no feature code.
 */

import "./board-lod.css";
import { useState, type ReactNode } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DetailLevel } from "../../engine/lod";
import type { BoardAccent } from "../../items/types";
import { accentStyle } from "../TileFace";
import { Bar, Glyph, Lines, Pad, Stack, u } from "./StructureKit";

type FaceLevel = Exclude<DetailLevel, "full">;

export function LevelLayers({ level, render }: { level: DetailLevel; render: (level: FaceLevel) => ReactNode }) {
  const [shown, setShown] = useState<DetailLevel>(level);
  const [from, setFrom] = useState<DetailLevel | null>(null);
  if (level !== shown) {
    setFrom(shown);
    setShown(level);
  }
  const leaving = from !== null && from !== "full" ? from : null;
  // Words → bars in place (the skeleton IS the layout at that threshold): no fade, so nothing doubles.
  const cut = from === "full" && shown === "structure";
  return (
    <>
      {leaving && (
        <div key={`out-${leaving}`} data-board-overview data-lod-leaving={leaving} className="board-lod-layer board-lod-out" onAnimationEnd={() => setFrom(null)}>
          {render(leaving)}
        </div>
      )}
      {shown !== "full" && (
        <div
          key={`in-${shown}`}
          data-board-overview
          data-lod-level={shown}
          className={cn("board-lod-layer", from !== null && !cut && "board-lod-in")}
          onAnimationEnd={leaving ? undefined : () => setFrom(null)}
        >
          {render(shown)}
        </div>
      )}
    </>
  );
}

/** L1: the tile's header as it is drawn at full detail, over the type's skeleton. */
export function StructureFace({
  title,
  icon,
  accent,
  selected = false,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  accent: BoardAccent;
  selected?: boolean;
  /** The type's skeleton (`BoardItemType.structure`); the generic one when absent. */
  children?: ReactNode;
}) {
  return (
    <div data-board-structure className="board-structure absolute inset-0 flex flex-col overflow-hidden bg-card" data-selected={selected || undefined} style={accentStyle(accent)}>
      <div className="flex shrink-0 items-center border-b border-border" style={{ height: u(40), paddingInline: u(12), gap: u(8), borderBottomWidth: u(1) }}>
        {icon && <Glyph icon={icon} size={16} />}
        <p className="min-w-0 flex-1 truncate font-medium text-foreground" style={{ fontSize: u(14), lineHeight: u(20) }}>
          {title}
        </p>
        <Glyph icon={MoreHorizontal} size={16} />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">{children ?? <GenericStructure />}</div>
    </div>
  );
}

/** Every type's L1 on day one: a heading and paragraphs under the tile's own chrome. */
export function GenericStructure() {
  return (
    <Pad>
      <Bar w="58%" h={11} strong />
      <Lines />
      <Stack gap={9}>
        <Bar w="100%" />
        <Bar w="92%" />
        <Bar w="74%" />
      </Stack>
    </Pad>
  );
}

/** L3: only a couple of words fit — the type icon and the title, crisp, on the card's own surface. */
export function LabelFace({ title, icon: Icon, accent, selected = false }: { title: string; icon?: LucideIcon; accent: BoardAccent; selected?: boolean }) {
  return (
    <div data-board-label className="board-label absolute inset-0 overflow-hidden" data-selected={selected || undefined} style={accentStyle(accent)} title={title}>
      <div className="board-label-row">
        {Icon && <Icon aria-hidden className="board-label-icon shrink-0" />}
        <span className="board-label-text min-w-0 truncate font-semibold text-foreground">{title}</span>
      </div>
    </div>
  );
}
