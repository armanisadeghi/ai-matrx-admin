"use client";

/**
 * The shared toolbar for a SCROLLING stack of pages (the continuous layout,
 * and any host that stacks several documents in one scroll — e-signing).
 *
 * Same row, same fold plan as the paged viewer (./PdfToolbarRow.tsx). What
 * differs is only where the numbers come from:
 *   - zoom   → `useStackZoom`: one scale for EVERY page (1 = fit the width),
 *   - page   → `useScrollPages`: the page under the top of the scroll area,
 *              counted across every `[data-pdf-page]` in DOM order,
 *   - go-to  → scrolls that page to the top of the scroll area.
 * The host owns where the row sits (a sticky strip, or a header above its
 * scroller); it never draws its own zoom control.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { PdfToolbarRow, type PdfToolbarZoom } from "./PdfToolbarRow";
import { useScrollPages } from "./stack-hooks";
import type { PdfToolbarControl } from "./toolbar-plan";

export interface PdfStackToolbarProps {
  /** The element holding the pages (every `[data-pdf-page]` under it counts). */
  contentRef: RefObject<HTMLElement | null>;
  zoom: PdfToolbarZoom;
  pageNav?: boolean;
  pageLabel?: string;
  /** Host chrome docked INTO the row (see PdfDocumentRenderer). */
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  /** Stick to the top of the scroll area (the renderer's own strip). Hosts that place the row above their scroller leave this off. */
  sticky?: boolean;
  className?: string;
}

const STACK_OMIT: PdfToolbarControl[] = ["fitPage", "actual", "rotate"];

export function PdfStackToolbar({
  contentRef,
  zoom,
  pageNav = true,
  pageLabel,
  toolbarStart,
  toolbarEnd,
  sticky = false,
  className,
}: PdfStackToolbarProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = boxRef.current;
    if (!node) return undefined;
    const read = () => setBox({ width: node.clientWidth, height: node.offsetHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  const { page, pages, goTo } = useScrollPages(contentRef, sticky ? box.height : 0);
  return (
    <div
      ref={boxRef}
      data-pdf-stack-toolbar
      className={cn("w-full min-w-0 bg-background", sticky && "sticky top-0 z-10", className)}
    >
      <PdfToolbarRow
        width={box.width}
        zoom={zoom}
        page={page}
        pages={pages}
        onPage={goTo}
        pageNav={pageNav}
        pageLabel={pageLabel}
        omit={STACK_OMIT}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
      />
    </div>
  );
}
