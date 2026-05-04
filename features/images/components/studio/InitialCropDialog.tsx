"use client";

/**
 * InitialCropDialog
 * ─────────────────────────────────────────────────────────────────────────
 * Pops up the moment a user drops / pastes / picks one or more images into
 * the Image Studio, BEFORE any preset processing happens.
 *
 * Model — the image is static and the user adjusts a rectangle on top of it:
 *   • The image is rendered once at its natural aspect, scaled to fit the
 *     viewport. It never moves and never zooms.
 *   • The user manipulates a crop rectangle in real natural-image pixel
 *     coordinates: drag the body to pan, the corners to resize on both
 *     axes, the edges to resize on one axis. Aspect-ratio chips constrain
 *     the rectangle's shape; "Free" lets every edge move independently.
 *   • Default rect is the entire image — clicking the primary button with
 *     no adjustments passes the file through untouched (no canvas
 *     re-encoding, zero quality loss).
 *   • Picking an aspect chip resets the rectangle to the largest size that
 *     fits inside the image at that ratio, centered.
 *
 * Multiple files are walked through one at a time. The component owns no
 * studio state; it just emits the final list of (possibly-cropped) Files
 * via onComplete.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crop, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { cropFileToFile } from "@/features/images/utils/crop-file";

// ── Types ───────────────────────────────────────────────────────────────────

interface CropRect {
  /** All values are in natural source-image pixel coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = "tl" | "tr" | "bl" | "br" | "l" | "r" | "t" | "b" | "pan";
type ResizeHandle = Exclude<Handle, "pan">;

interface DragState {
  handle: Handle;
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
}

interface AspectChoice {
  label: string;
  value: number | undefined;
}

const ASPECT_CHOICES: AspectChoice[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "16:10", value: 16 / 10 },
  { label: "9:16", value: 9 / 16 },
];

/**
 * For each resize-handle, which edges of the rectangle it controls. Pan
 * is handled separately so it isn't in this map.
 */
const HANDLE_EDGES: Record<
  ResizeHandle,
  { l?: boolean; r?: boolean; t?: boolean; b?: boolean }
> = {
  tl: { l: true, t: true },
  tr: { r: true, t: true },
  bl: { l: true, b: true },
  br: { r: true, b: true },
  l: { l: true },
  r: { r: true },
  t: { t: true },
  b: { b: true },
};

const MIN_NATURAL = 4;

// ── Pure helpers ────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Largest aspect-locked rectangle that fits inside the image, centered.
 * For 1200×900 + aspect=1 this returns {x:150, y:0, w:900, h:900}.
 */
function fitAspectInImage(
  aspect: number,
  imgW: number,
  imgH: number,
): CropRect {
  const imageAspect = imgW / imgH;
  let w: number;
  let h: number;
  if (aspect >= imageAspect) {
    w = imgW;
    h = w / aspect;
  } else {
    h = imgH;
    w = h * aspect;
  }
  return { x: (imgW - w) / 2, y: (imgH - h) / 2, w, h };
}

/**
 * Final-pass safety: ensure the rectangle is within image bounds and
 * obeys aspect (if locked). If aspect-locked and oversized, scale down
 * preserving the ratio; then translate so it fits.
 */
function clampRectInImage(
  rect: CropRect,
  aspect: number | undefined,
  imgW: number,
  imgH: number,
): CropRect {
  let { x, y, w, h } = rect;

  if (aspect !== undefined) {
    if (w > imgW) {
      w = imgW;
      h = w / aspect;
    }
    if (h > imgH) {
      h = imgH;
      w = h * aspect;
    }
  } else {
    w = Math.min(w, imgW);
    h = Math.min(h, imgH);
  }

  w = Math.max(MIN_NATURAL, w);
  h = Math.max(MIN_NATURAL, h);

  x = clamp(x, 0, imgW - w);
  y = clamp(y, 0, imgH - h);

  return { x, y, w, h };
}

/**
 * Apply a pointer delta (in natural pixels) to the start rect, given the
 * active handle and aspect lock. The result still needs to go through
 * clampRectInImage() before it's displayed.
 */
function applyDragToRect(
  state: DragState,
  deltaX: number,
  deltaY: number,
  aspect: number | undefined,
): CropRect {
  const r = state.startRect;

  if (state.handle === "pan") {
    return { x: r.x + deltaX, y: r.y + deltaY, w: r.w, h: r.h };
  }

  const edges = HANDLE_EDGES[state.handle];
  let left = r.x;
  let top = r.y;
  let right = r.x + r.w;
  let bottom = r.y + r.h;

  if (edges.l) left += deltaX;
  if (edges.r) right += deltaX;
  if (edges.t) top += deltaY;
  if (edges.b) bottom += deltaY;

  // Prevent the user from dragging an edge past the opposite edge —
  // collapse to MIN_NATURAL while keeping the anchored side put.
  if (right - left < MIN_NATURAL) {
    if (edges.l) left = right - MIN_NATURAL;
    else if (edges.r) right = left + MIN_NATURAL;
  }
  if (bottom - top < MIN_NATURAL) {
    if (edges.t) top = bottom - MIN_NATURAL;
    else if (edges.b) bottom = top + MIN_NATURAL;
  }

  if (aspect !== undefined) {
    const w = right - left;
    const h = bottom - top;
    const xMoving = !!(edges.l || edges.r);
    const yMoving = !!(edges.t || edges.b);

    if (xMoving && yMoving) {
      // Corner — pick the dominant axis based on relative size change
      // and derive the other so the rect's shape locks to `aspect`.
      const wRatio = w / r.w;
      const hRatio = h / r.h;
      if (Math.abs(wRatio - 1) >= Math.abs(hRatio - 1)) {
        const targetH = w / aspect;
        const dh = targetH - h;
        if (edges.t) top -= dh;
        else bottom += dh;
      } else {
        const targetW = h * aspect;
        const dw = targetW - w;
        if (edges.l) left -= dw;
        else right += dw;
      }
    } else if (xMoving) {
      // Single horizontal edge — grow vertical edges symmetrically
      // about the rect's vertical center, so the rectangle's
      // perpendicular position feels stable.
      const targetH = (right - left) / aspect;
      const cy = (top + bottom) / 2;
      top = cy - targetH / 2;
      bottom = cy + targetH / 2;
    } else if (yMoving) {
      const targetW = (bottom - top) * aspect;
      const cx = (left + right) / 2;
      left = cx - targetW / 2;
      right = cx + targetW / 2;
    }
  }

  return { x: left, y: top, w: right - left, h: bottom - top };
}

// ── Component ───────────────────────────────────────────────────────────────

interface InitialCropDialogProps {
  /** Queue of files to walk through. Empty → dialog stays closed. */
  files: File[];
  /** Fired once every file has been processed (kept-as-is OR cropped). */
  onComplete: (results: File[]) => void;
  /** User dismissed the dialog entirely — discard all queued files. */
  onCancel: () => void;
}

export function InitialCropDialog({
  files,
  onComplete,
  onCancel,
}: InitialCropDialogProps) {
  const open = files.length > 0;

  // Queue position
  const [index, setIndex] = useState(0);
  const resultsRef = useRef<File[]>([]);

  // Active file + its image source
  const activeFile = files[index] ?? null;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  // Cropper state
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Container measurement (for natural ↔ display coordinate mapping).
  // Use a callback ref so we attach the ResizeObserver the moment Radix
  // actually mounts DialogContent — a plain useEffect with `[]` deps
  // would run while containerRef.current is still null (DialogContent is
  // only inserted into the DOM once `open === true`), and the observer
  // would never attach. That left containerSize at {0, 0}, imageDisplay
  // at null, and the image stayed invisible behind the dim layers.
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    containerElRef.current = el;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      setContainerSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    ro.observe(el);
    observerRef.current = ro;
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  // Object URL for the active file (revoked on change).
  useEffect(() => {
    if (!activeFile) {
      setImageUrl(null);
      setNaturalSize(null);
      setCrop(null);
      setAspect(undefined);
      return;
    }
    const url = URL.createObjectURL(activeFile);
    setImageUrl(url);
    setNaturalSize(null);
    setCrop(null);
    setAspect(undefined);
    return () => URL.revokeObjectURL(url);
  }, [activeFile]);

  // When the image loads, capture its natural dimensions and default the
  // crop to the entire image.
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setNaturalSize({ w, h });
      setCrop({ x: 0, y: 0, w, h });
    },
    [],
  );

  // Reset queue state when the parent feeds in a fresh batch.
  useEffect(() => {
    if (open) {
      setIndex(0);
      resultsRef.current = [];
    }
  }, [open, files]);

  // ── Display geometry ────────────────────────────────────────────────────

  const imageDisplay = useMemo(() => {
    if (!naturalSize || containerSize.w <= 0 || containerSize.h <= 0)
      return null;
    const naturalAspect = naturalSize.w / naturalSize.h;
    const containerAspect = containerSize.w / containerSize.h;
    let dW: number;
    let dH: number;
    if (containerAspect > naturalAspect) {
      dH = containerSize.h;
      dW = dH * naturalAspect;
    } else {
      dW = containerSize.w;
      dH = dW / naturalAspect;
    }
    return {
      x: (containerSize.w - dW) / 2,
      y: (containerSize.h - dH) / 2,
      w: dW,
      h: dH,
      scale: dW / naturalSize.w,
    };
  }, [naturalSize, containerSize]);

  const rectDisplay = useMemo(() => {
    if (!imageDisplay || !crop) return null;
    return {
      left: imageDisplay.x + crop.x * imageDisplay.scale,
      top: imageDisplay.y + crop.y * imageDisplay.scale,
      width: crop.w * imageDisplay.scale,
      height: crop.h * imageDisplay.scale,
    };
  }, [imageDisplay, crop]);

  // ── Aspect / reset ──────────────────────────────────────────────────────

  const handleAspectChoice = useCallback(
    (nextAspect: number | undefined) => {
      setAspect(nextAspect);
      if (nextAspect !== undefined && naturalSize) {
        setCrop(fitAspectInImage(nextAspect, naturalSize.w, naturalSize.h));
      }
    },
    [naturalSize],
  );

  const handleReset = useCallback(() => {
    if (!naturalSize) return;
    setAspect(undefined);
    setCrop({ x: 0, y: 0, w: naturalSize.w, h: naturalSize.h });
  }, [naturalSize]);

  // ── Pointer interaction ─────────────────────────────────────────────────

  const beginDrag = useCallback(
    (handle: Handle) => (e: React.PointerEvent) => {
      if (!crop) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: crop,
      });
    },
    [crop],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !imageDisplay || !naturalSize) return;
      const deltaX = (e.clientX - drag.startClientX) / imageDisplay.scale;
      const deltaY = (e.clientY - drag.startClientY) / imageDisplay.scale;
      const proposed = applyDragToRect(drag, deltaX, deltaY, aspect);
      setCrop(clampRectInImage(proposed, aspect, naturalSize.w, naturalSize.h));
    },
    [drag, imageDisplay, naturalSize, aspect],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setDrag(null);
    },
    [drag],
  );

  // Common pointer handlers attached to every interactive element so
  // pointer-capture routes pointermove/up back to whichever element
  // started the drag.
  const pointerHandlers = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  // ── Queue advance ───────────────────────────────────────────────────────

  const advance = useCallback(
    (nextResult: File) => {
      resultsRef.current = [...resultsRef.current, nextResult];
      const nextIndex = index + 1;
      if (nextIndex >= files.length) {
        onComplete(resultsRef.current);
      } else {
        setIndex(nextIndex);
      }
    },
    [files.length, index, onComplete],
  );

  /**
   * Whether the rect is meaningfully different from "full image". When
   * it isn't, we pass the original file through unchanged to preserve
   * pixel-perfect quality (no canvas re-encode).
   */
  const cropIsModified = useMemo(() => {
    if (!crop || !naturalSize) return false;
    return (
      crop.x > 0.5 ||
      crop.y > 0.5 ||
      crop.x + crop.w < naturalSize.w - 0.5 ||
      crop.y + crop.h < naturalSize.h - 0.5
    );
  }, [crop, naturalSize]);

  const handlePrimary = useCallback(async () => {
    if (!activeFile || !crop) return;
    if (!cropIsModified) {
      advance(activeFile);
      return;
    }
    setIsProcessing(true);
    try {
      const cropped = await cropFileToFile(activeFile, {
        x: crop.x,
        y: crop.y,
        width: crop.w,
        height: crop.h,
      });
      advance(cropped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Crop failed";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [activeFile, advance, crop, cropIsModified]);

  const handleSkipRemaining = useCallback(() => {
    const remaining = files.slice(index);
    onComplete([...resultsRef.current, ...remaining]);
  }, [files, index, onComplete]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) onCancel();
    },
    [onCancel],
  );

  const queueLabel =
    files.length > 1 ? `Image ${index + 1} of ${files.length}` : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Crop className="h-4 w-4 text-primary" />
                Crop before processing
              </DialogTitle>
              <DialogDescription className="text-xs">
                Drag the rectangle, its corners, or its edges to keep just part
                of the image. Leave it as-is to use the full original.
              </DialogDescription>
            </div>
            {queueLabel && (
              <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {queueLabel}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Cropper viewport — image is static; the rectangle is the only
                    thing that moves. */}
        <div
          ref={setContainerRef}
          className="relative w-full bg-zinc-950 h-[60vh] select-none touch-none overflow-hidden"
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              onLoad={handleImageLoad}
              draggable={false}
              className="absolute pointer-events-none select-none"
              style={
                imageDisplay
                  ? {
                      left: imageDisplay.x,
                      top: imageDisplay.y,
                      width: imageDisplay.w,
                      height: imageDisplay.h,
                    }
                  : { visibility: "hidden" }
              }
            />
          )}

          {imageDisplay && rectDisplay && (
            <>
              {/* Dim panels around the rect, bounded to the image. */}
              <div
                className="absolute bg-black/55 pointer-events-none"
                style={{
                  left: imageDisplay.x,
                  top: imageDisplay.y,
                  width: imageDisplay.w,
                  height: rectDisplay.top - imageDisplay.y,
                }}
              />
              <div
                className="absolute bg-black/55 pointer-events-none"
                style={{
                  left: imageDisplay.x,
                  top: rectDisplay.top + rectDisplay.height,
                  width: imageDisplay.w,
                  height:
                    imageDisplay.y +
                    imageDisplay.h -
                    (rectDisplay.top + rectDisplay.height),
                }}
              />
              <div
                className="absolute bg-black/55 pointer-events-none"
                style={{
                  left: imageDisplay.x,
                  top: rectDisplay.top,
                  width: rectDisplay.left - imageDisplay.x,
                  height: rectDisplay.height,
                }}
              />
              <div
                className="absolute bg-black/55 pointer-events-none"
                style={{
                  left: rectDisplay.left + rectDisplay.width,
                  top: rectDisplay.top,
                  width:
                    imageDisplay.x +
                    imageDisplay.w -
                    (rectDisplay.left + rectDisplay.width),
                  height: rectDisplay.height,
                }}
              />

              {/* Crop rectangle */}
              <div
                className="absolute border-[1.5px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
                style={{
                  left: rectDisplay.left,
                  top: rectDisplay.top,
                  width: rectDisplay.width,
                  height: rectDisplay.height,
                }}
                onPointerDown={beginDrag("pan")}
                {...pointerHandlers}
              >
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/25" />
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/25" />
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/25" />
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/25" />
                </div>

                {/* Edge handles */}
                <button
                  type="button"
                  aria-label="Resize top"
                  onPointerDown={beginDrag("t")}
                  {...pointerHandlers}
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-2 bg-white border border-zinc-900/50 rounded-sm cursor-ns-resize"
                />
                <button
                  type="button"
                  aria-label="Resize bottom"
                  onPointerDown={beginDrag("b")}
                  {...pointerHandlers}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-7 h-2 bg-white border border-zinc-900/50 rounded-sm cursor-ns-resize"
                />
                <button
                  type="button"
                  aria-label="Resize left"
                  onPointerDown={beginDrag("l")}
                  {...pointerHandlers}
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-7 bg-white border border-zinc-900/50 rounded-sm cursor-ew-resize"
                />
                <button
                  type="button"
                  aria-label="Resize right"
                  onPointerDown={beginDrag("r")}
                  {...pointerHandlers}
                  className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-7 bg-white border border-zinc-900/50 rounded-sm cursor-ew-resize"
                />

                {/* Corner handles */}
                <button
                  type="button"
                  aria-label="Resize top-left"
                  onPointerDown={beginDrag("tl")}
                  {...pointerHandlers}
                  className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-900/50 rounded-sm cursor-nwse-resize"
                />
                <button
                  type="button"
                  aria-label="Resize top-right"
                  onPointerDown={beginDrag("tr")}
                  {...pointerHandlers}
                  className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-900/50 rounded-sm cursor-nesw-resize"
                />
                <button
                  type="button"
                  aria-label="Resize bottom-left"
                  onPointerDown={beginDrag("bl")}
                  {...pointerHandlers}
                  className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border border-zinc-900/50 rounded-sm cursor-nesw-resize"
                />
                <button
                  type="button"
                  aria-label="Resize bottom-right"
                  onPointerDown={beginDrag("br")}
                  {...pointerHandlers}
                  className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border border-zinc-900/50 rounded-sm cursor-nwse-resize"
                />
              </div>
            </>
          )}

          {/* Live size indicator */}
          {crop && naturalSize && (
            <div className="absolute top-3 left-3 text-[11px] font-mono tabular-nums bg-zinc-900/70 text-zinc-100 px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">
              {Math.round(crop.w)} × {Math.round(crop.h)}
              <span className="text-zinc-400 ml-2">
                of {naturalSize.w} × {naturalSize.h}
              </span>
            </div>
          )}
        </div>

        {/* Aspect chips */}
        <div className="px-5 py-3 border-t border-border flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Aspect</span>
          {ASPECT_CHOICES.map((c) => {
            const active = aspect === c.value;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => handleAspectChoice(c.value)}
                disabled={!naturalSize}
                className={cn(
                  "h-7 px-2.5 text-xs rounded-md border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted",
                  !naturalSize && "opacity-50 cursor-not-allowed",
                )}
              >
                {c.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleReset}
            disabled={!naturalSize}
            className="ml-auto inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border bg-muted/30 sm:justify-between gap-2">
          {files.length > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipRemaining}
              disabled={isProcessing}
              className="text-muted-foreground"
            >
              <SkipForward className="h-3.5 w-3.5 mr-1.5" />
              Use originals for the rest
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            onClick={handlePrimary}
            disabled={isProcessing || !crop}
          >
            <Crop className="h-3.5 w-3.5 mr-1.5" />
            {isProcessing ? "Cropping…" : cropIsModified ? "Apply Crop" : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
