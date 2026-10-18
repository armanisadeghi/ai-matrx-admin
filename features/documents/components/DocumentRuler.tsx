"use client";

/** View → Show ruler: inch ticks along the top of the page, margins shaded, at the current zoom. */

import { useEffect, useState } from "react";
import { PX_PER_INCH } from "@ai-matrx/office/core";
import { rulerGeometry } from "@ai-matrx/office/docs/tools";

interface Props {
  /** Width of the area the page is centerd in. */
  containerWidth: number;
  zoom: number;
  /** The document style, read fresh (page setup changes it). */
  readStyle: () => { pageSize?: { width?: number }; marginLeft?: number; marginRight?: number; pageOrient?: number } | undefined;
  /** Bumped whenever page setup changes. */
  rev: number;
}

export function DocumentRuler({ containerWidth, zoom, readStyle, rev }: Props) {
  const [, tick] = useState(0);
  useEffect(() => tick((n) => n + 1), [rev, zoom, containerWidth]);
  const style = readStyle();
  const pageWidthPx = style?.pageSize?.width ?? 816;
  const g = rulerGeometry({
    containerWidth,
    zoom,
    pageWidthPx,
    marginLeftPx: style?.marginLeft ?? PX_PER_INCH,
    marginRightPx: style?.marginRight ?? PX_PER_INCH,
  });
  return (
    <div data-doc-ruler className="relative h-5 shrink-0 select-none overflow-hidden border-b border-border bg-muted/40 text-[10px] text-muted-foreground" aria-label="Ruler" role="img">
      <div className="absolute inset-y-0 bg-background" style={{ left: g.pageLeft, width: g.pageWidth }} />
      <div className="absolute inset-y-0 bg-muted" style={{ left: g.pageLeft, width: g.marginLeft }} />
      <div className="absolute inset-y-0 bg-muted" style={{ left: g.pageLeft + g.pageWidth - g.marginRight, width: g.marginRight }} />
      {g.ticks.map((t) => (
        <div key={t.x} className="absolute bottom-0" style={{ left: t.x }}>
          <div className="w-px bg-muted-foreground/70" style={{ height: t.kind === "inch" ? 10 : t.kind === "half" ? 7 : 4 }} />
          {t.label ? <span className="absolute bottom-[3px] left-1">{t.label}</span> : null}
        </div>
      ))}
    </div>
  );
}
