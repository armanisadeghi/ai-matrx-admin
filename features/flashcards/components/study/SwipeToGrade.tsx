// features/flashcards/components/study/SwipeToGrade.tsx
//
// Swipe-to-grade (Anki/Quizlet mobile ergonomics) for the classic study deck.
// Touch only (pointerType "touch"): mouse and pen keep the buttons and keys.
// Right = knew it, left = again. Only armed once the answer is showing — the
// driver passes `enabled` = flipped && gradable.
//
// It never fights the page: the gesture locks to an axis after LOCK_PX of
// travel; a vertical start is abandoned on the spot (the browser keeps the
// scroll via `touch-action: pan-y`), and a horizontal drag that ends short of
// the threshold springs back without grading. A tap (no travel) is untouched,
// so tap-to-flip still works; the click that follows a drag is swallowed.
// Reduced motion: the card does not move or tilt — only the edge labels
// brighten, and a committed swipe grades the same way.
//
// React Compiler is on: no manual useMemo / useCallback / React.memo.

"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwipeGrade = "good" | "again";

/** Travel before the gesture picks an axis. */
const LOCK_PX = 10;
/** A swipe commits past this share of the card width (never under COMMIT_MIN_PX). */
const COMMIT_FRACTION = 0.28;
const COMMIT_MIN_PX = 80;
/** How long a drag swallows the click the browser may still send. */
const CLICK_SUPPRESS_MS = 400;

export function swipeThreshold(width: number): number {
  return Math.max(COMMIT_MIN_PX, width * COMMIT_FRACTION);
}

/** The grade a horizontal drag of `dx` px commits on a card `width` px wide. */
export function swipeOutcome(dx: number, width: number): SwipeGrade | null {
  const threshold = swipeThreshold(width);
  if (dx >= threshold) return "good";
  if (dx <= -threshold) return "again";
  return null;
}

interface DragStart {
  pointerId: number;
  x: number;
  y: number;
  width: number;
  axis: "x" | "y" | null;
}

export interface SwipeToGrade {
  /** Spread on the element that receives the gesture. */
  handlers: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onClickCapture: (e: MouseEvent<HTMLElement>) => void;
  };
  /** `touch-action` for the gesture element — vertical scroll stays native. */
  touchStyle: CSSProperties | undefined;
  /** Transform for the moving card (empty under reduced motion / at rest). */
  cardStyle: CSSProperties | undefined;
  /** Signed drag distance in px (0 at rest). */
  dx: number;
  /** 0…1 progress toward the commit threshold. */
  progress: number;
  dragging: boolean;
}

export function useSwipeToGrade({
  enabled,
  onGrade,
}: {
  enabled: boolean;
  onGrade: (grade: SwipeGrade) => void;
}): SwipeToGrade {
  const [dx, setDx] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startRef = useRef<DragStart | null>(null);
  const suppressClickUntil = useRef(0);

  const reset = (): void => {
    startRef.current = null;
    setDragging(false);
    setDx(0);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>): void => {
    if (!enabled || e.pointerType !== "touch" || !e.isPrimary) return;
    const rect = e.currentTarget.getBoundingClientRect();
    startRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      axis: null,
    };
    setWidth(rect.width);
    setReducedMotion(
      typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
    );
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>): void => {
    const start = startRef.current;
    if (!start || e.pointerId !== start.pointerId) return;
    const moveX = e.clientX - start.x;
    const moveY = e.clientY - start.y;
    if (start.axis === null) {
      if (Math.abs(moveX) < LOCK_PX && Math.abs(moveY) < LOCK_PX) return;
      if (Math.abs(moveY) >= Math.abs(moveX)) {
        // A scroll (or the drawer's vertical swipe) — not ours.
        startRef.current = null;
        return;
      }
      start.axis = "x";
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture is a nicety; the move stream still arrives without it.
      }
    }
    setDx(moveX);
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>): void => {
    const start = startRef.current;
    if (!start || e.pointerId !== start.pointerId) return;
    const wasDrag = start.axis === "x";
    const outcome = wasDrag
      ? swipeOutcome(e.clientX - start.x, start.width)
      : null;
    reset();
    if (!wasDrag) return;
    suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
    if (outcome && enabled) onGrade(outcome);
  };

  const onClickCapture = (e: MouseEvent<HTMLElement>): void => {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const threshold = swipeThreshold(width || 1);
  const progress = Math.min(1, Math.abs(dx) / threshold);
  const cardStyle: CSSProperties | undefined =
    dragging && !reducedMotion
      ? {
          transform: `translateX(${dx}px) rotate(${dx / 24}deg)`,
          transition: "none",
        }
      : !dragging && !reducedMotion
        ? { transition: "transform 180ms ease-out" }
        : undefined;

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
      onClickCapture,
    },
    touchStyle: enabled ? { touchAction: "pan-y" } : undefined,
    cardStyle,
    dx,
    progress,
    dragging,
  };
}

/**
 * The drag affordance: an "Again" tab on the left edge and a "Knew it" tab on
 * the right, quiet at rest and filling in as the card travels toward them.
 * Shown only while swipe grading is armed on a touch screen.
 */
export function SwipeGradeEdges({
  swipe,
  className,
}: {
  swipe: SwipeToGrade;
  className?: string;
}) {
  const towardGood = swipe.dx > 0 ? swipe.progress : 0;
  const towardAgain = swipe.dx < 0 ? swipe.progress : 0;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between [@media(pointer:coarse)]:flex",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center gap-0.5 rounded-r-full border border-l-0 py-1.5 pl-1 pr-2.5 text-[11px] font-semibold",
          towardAgain >= 1
            ? "border-destructive bg-destructive text-destructive-foreground"
            : "border-border bg-background/90 text-muted-foreground",
        )}
        style={{ opacity: 0.55 + towardAgain * 0.45 }}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Again
      </span>
      <span
        className={cn(
          "flex items-center gap-0.5 rounded-l-full border border-r-0 py-1.5 pl-2.5 pr-1 text-[11px] font-semibold",
          towardGood >= 1
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background/90 text-muted-foreground",
        )}
        style={{ opacity: 0.55 + towardGood * 0.45 }}
      >
        Knew it
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
