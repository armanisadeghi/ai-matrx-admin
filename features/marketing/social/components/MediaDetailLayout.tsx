"use client";

/**
 * THE layout of a previewed post: the media is the hero, the details take the
 * rest. One primitive for every place a post's media opens large (post window,
 * canvas tab, page, board tile, swipe item, ad creative).
 *
 *   side    media column as tall as the host allows (width follows from the
 *           media's aspect ratio), details to its right. Chosen when the host
 *           is wide enough for it, and for wide (16:9) media only when it is
 *           really wide.
 *   stack   media on top, full width, capped so a peek of the details stays
 *           visible; details below. Phones and narrow windows.
 *
 * The host measures itself (ResizeObserver) so the media scales with the window.
 * `MediaStage` is the aspect-ratio box both modes use: it never letterboxes
 * inside itself, the box simply is the media's shape.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const PAD = 12;
const GAP = 12;
/** Height reserved under the media for the slim action row. */
const FOOTER_H = 36;
/** Below this host width the details always go below the media. */
const SIDE_MIN_W = 520;
/** A landscape media goes side-by-side only when the host is at least this wide. */
const SIDE_LANDSCAPE_MIN_W = 900;
/** The details peek that stays visible under a tall media when stacked. */
const PEEK_H = 150;
const MIN_MEDIA_W = 160;

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export interface MediaLayoutPlan {
  mode: "side" | "stack";
  /** Media box, in px. */
  width: number;
  height: number;
}

/** Pure: the plan for a host of w x h and a media of this width/height ratio. */
export function planMediaLayout(w: number, h: number, ratio: number): MediaLayoutPlan {
  const r = Math.max(0.2, Math.min(5, ratio || 1));
  const landscape = r > 1.1;
  const side = w >= SIDE_MIN_W && (!landscape || w >= SIDE_LANDSCAPE_MIN_W);
  if (side) {
    const maxH = Math.max(160, h - PAD * 2 - FOOTER_H - 8);
    const maxW = Math.max(MIN_MEDIA_W, (w - PAD * 2 - GAP) * (landscape ? 0.62 : 0.5));
    let height = maxH;
    let width = height * r;
    if (width > maxW) {
      width = maxW;
      height = width / r;
    }
    return { mode: "side", width: Math.round(width), height: Math.round(height) };
  }
  const availW = Math.max(MIN_MEDIA_W, w - PAD * 2);
  const maxH = Math.max(160, h - PAD * 2 - FOOTER_H - (landscape ? Math.round(h * 0.35) : PEEK_H));
  let width = availW;
  let height = width / r;
  if (height > maxH) {
    height = maxH;
    width = height * r;
  }
  return { mode: "stack", width: Math.round(width), height: Math.round(height) };
}

/** A box of exactly the media's shape. */
export function MediaStage({ width, height, children, className }: { width: number; height: number; children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-black", className)} style={{ width, height }}>
      {children}
    </div>
  );
}

export function MediaDetailLayout({
  ratio,
  media,
  footer,
  details,
  className,
  detailsClassName,
  scrollDetails = true,
}: {
  /** width / height of the media. */
  ratio: number;
  /** Receives the stage size and returns the player. */
  media: (box: { width: number; height: number }) => ReactNode;
  /** The slim action row under the media. */
  footer?: ReactNode;
  details: ReactNode;
  className?: string;
  detailsClassName?: string;
  /** Side mode: details scroll inside their column. */
  scrollDetails?: boolean;
}) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const plan = size ? planMediaLayout(size.w, size.h, ratio) : null;
  const side = plan?.mode === "side";
  return (
    <div ref={ref} className={cn("h-full min-h-0 w-full", side ? "overflow-hidden" : "overflow-y-auto", className)}>
      {plan ? (
        <div className={cn("gap-3 p-3", side ? "flex h-full min-h-0" : "flex flex-col")}>
          <div className={cn("flex shrink-0 flex-col gap-1.5", side ? "" : "items-center")} style={{ width: side ? plan.width : undefined }}>
            <MediaStage width={plan.width} height={plan.height}>{media({ width: plan.width, height: plan.height })}</MediaStage>
            {footer ? <div className="flex min-w-0 items-center" style={{ width: plan.width }}>{footer}</div> : null}
          </div>
          <div className={cn("flex min-w-0 flex-1 flex-col gap-2.5", side && scrollDetails && "min-h-0 overflow-y-auto", detailsClassName)}>{details}</div>
        </div>
      ) : null}
    </div>
  );
}
