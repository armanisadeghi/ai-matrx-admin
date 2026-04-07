"use client";

/**
 * WindowTray
 *
 * Renders the bottom-right minimized-window dock.
 * Mount exactly ONE instance high in the component tree (e.g. inside the
 * root layout, alongside any other fixed overlays).  It reads minimized window
 * entries from Redux and renders a draggable chip for each one.
 *
 * Chips:
 *  - Stacked horizontally from right → left (newest on the right)
 *  - Single-click restores the window (drag suppresses the click)
 *  - Chips are draggable within the tray to reorder them (moveTraySlot)
 *  - The tray itself is 100% CSS — fixed, bottom-right, no z-fighting
 *
 * Usage:
 *   // In your root layout or shell (outside any transform/overflow ancestor):
 *   <WindowTray />
 */

import React, { useCallback, useRef } from "react";
import { ChevronsUpDown, AppWindow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  restoreWindow,
  moveTraySlot,
  focusWindow,
  selectTrayWindows,
} from "@/lib/redux/slices/windowManagerSlice";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHIP_WIDTH = 210;
const CHIP_GAP = 8;
const TRAY_BOTTOM = 12;
const TRAY_RIGHT = 12;

// ─── Component ────────────────────────────────────────────────────────────────

export function WindowTray() {
  const minimized = useAppSelector(selectTrayWindows);

  if (minimized.length === 0) return null;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        bottom: TRAY_BOTTOM,
        right: TRAY_RIGHT,
        zIndex: 9999,
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "flex-end",
        gap: CHIP_GAP,
      }}
    >
      {[...minimized].reverse().map((win) => (
        <TrayChip
          key={win.id}
          id={win.id}
          title={win.title}
          chipWidth={CHIP_WIDTH}
        />
      ))}
    </div>
  );
}

// ─── TrayChip ─────────────────────────────────────────────────────────────────

interface TrayChipProps {
  id: string;
  title: string;
  chipWidth: number;
}

function TrayChip({ id, title, chipWidth }: TrayChipProps) {
  const dispatch = useAppDispatch();
  const dragStartX = useRef<number | null>(null);
  const dragStartSlot = useRef<number | null>(null);
  // Track whether the mousedown moved enough to count as a drag
  const didDrag = useRef(false);

  const handleRestore = useCallback(() => {
    dispatch(restoreWindow(id));
  }, [dispatch, id]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(focusWindow(id));
      dragStartX.current = e.clientX;
      didDrag.current = false;

      const onMove = (ev: MouseEvent) => {
        if (dragStartX.current === null) return;
        const dx = Math.abs(ev.clientX - dragStartX.current);
        if (dx > 4) didDrag.current = true;

        const slotDx = dragStartX.current - ev.clientX;
        const slotDelta = Math.round(slotDx / (chipWidth + CHIP_GAP));
        if (slotDelta !== 0 && dragStartSlot.current !== null) {
          const newSlot = Math.max(0, dragStartSlot.current + slotDelta);
          dispatch(moveTraySlot({ id, toSlot: newSlot }));
          dragStartX.current = ev.clientX;
          dragStartSlot.current = newSlot;
        }
      };

      const onUp = () => {
        dragStartX.current = null;
        dragStartSlot.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [dispatch, id, chipWidth],
  );

  // Single-click restores, but only if the user didn't drag
  const handleClick = useCallback(() => {
    if (!didDrag.current) {
      handleRestore();
    }
  }, [handleRestore]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col rounded-xl select-none",
        "bg-card/95 backdrop-blur-md border border-border shadow-lg",
        "cursor-grab active:cursor-grabbing",
        "hover:bg-accent/60 transition-colors duration-150",
        "overflow-hidden",
      )}
      style={{ width: chipWidth, minWidth: chipWidth }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title="Click to restore"
    >
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-8 border-b border-border/60">
        <AppWindow className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate flex-1 text-xs font-semibold text-foreground/90">
          {title}
        </span>
        <button
          type="button"
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleRestore();
          }}
          aria-label="Restore window"
        >
          <ChevronsUpDown className="h-3 w-3" />
        </button>
      </div>

      {/* ── Body row ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 px-3 h-8">
        <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/20" />
        <div className="w-1/3 h-1.5 rounded-full bg-muted-foreground/10" />
      </div>
    </div>
  );
}

export default WindowTray;
