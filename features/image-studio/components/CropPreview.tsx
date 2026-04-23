"use client";

/**
 * CropPreview — two-pane live crop preview.
 *
 * Left pane  : the uploaded source image at full display size, overlaid with
 *              a rectangle highlighting the exact region that will be kept.
 * Right pane : a canvas rendering the final cropped output (scaled to fit
 *              the pane, but preserving the target aspect ratio).
 *
 * All math is client-side and runs on every prop change — there's no server
 * round-trip. For `attention` / `entropy` the overlay falls back to center
 * and a "server picks the region" note is shown.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Info, Sparkles, Scan } from "lucide-react";
import type { ImageFit, ImagePosition } from "../types";
import {
    computeSourceCropRect,
    renderCropToCanvas,
} from "../utils/compute-crop";
import { formatBytes, formatDimensions } from "../utils/format-bytes";

interface CropPreviewProps {
    sourceUrl: string | null;
    sourceWidth: number | null;
    sourceHeight: number | null;
    sourceName?: string;
    sourceBytes?: number;

    dstWidth: number;
    dstHeight: number;
    presetName?: string;

    fit: ImageFit;
    position: ImagePosition;
    backgroundColor: string;
}

export function CropPreview({
    sourceUrl,
    sourceWidth,
    sourceHeight,
    sourceName,
    sourceBytes,
    dstWidth,
    dstHeight,
    presetName,
    fit,
    position,
    backgroundColor,
}: CropPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState<string | null>(null);

    // Cache a single decoded Image so we don't reload on every prop change.
    const imgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!sourceUrl) {
            imgRef.current = null;
            setImgLoaded(false);
            setImgError(null);
            return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            imgRef.current = img;
            setImgLoaded(true);
            setImgError(null);
        };
        img.onerror = () => {
            setImgError("Could not load preview");
            setImgLoaded(false);
        };
        img.src = sourceUrl;
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [sourceUrl]);

    // Render the output canvas whenever the settings or source change.
    useEffect(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !imgLoaded) return;
        renderCropToCanvas(canvas, img, dstWidth, dstHeight, fit, position, backgroundColor);
    }, [imgLoaded, dstWidth, dstHeight, fit, position, backgroundColor]);

    const cropRect = useMemo(() => {
        if (!sourceWidth || !sourceHeight) return null;
        return computeSourceCropRect(
            sourceWidth,
            sourceHeight,
            dstWidth,
            dstHeight,
            fit,
            position,
        );
    }, [sourceWidth, sourceHeight, dstWidth, dstHeight, fit, position]);

    if (!sourceUrl || !sourceWidth || !sourceHeight) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-sm text-muted-foreground">
                <Info className="h-6 w-6 mb-2 text-muted-foreground/60" />
                <p className="font-medium">No file selected</p>
                <p className="text-xs mt-1">Drop an image to see the crop preview.</p>
            </div>
        );
    }

    const smartCrop = position === "attention" || position === "entropy";

    return (
        <div className="flex flex-col h-full min-h-0 gap-3 p-3">
            {/* ── Two-pane preview ─────────────────────────────────────── */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Source + crop overlay */}
                <div className="flex flex-col gap-1.5 min-h-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                        <span>Source</span>
                        <span className="font-mono normal-case text-muted-foreground/80">
                            {formatDimensions(sourceWidth, sourceHeight)}
                            {sourceBytes != null && ` · ${formatBytes(sourceBytes)}`}
                        </span>
                    </p>
                    <div className="relative flex-1 min-h-0 rounded-lg border border-border bg-[conic-gradient(at_top_left,_rgba(0,0,0,0.08)_0deg,_rgba(0,0,0,0.12)_90deg,_rgba(0,0,0,0.08)_180deg,_rgba(0,0,0,0.12)_270deg)] bg-muted/20 overflow-hidden flex items-center justify-center">
                        <div className="relative inline-block max-w-full max-h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={sourceUrl}
                                alt={sourceName ?? "source"}
                                className="block max-w-full max-h-full object-contain select-none pointer-events-none"
                            />
                            {/* Crop overlay */}
                            {fit === "cover" && cropRect && (
                                <>
                                    <div
                                        className="absolute pointer-events-none"
                                        style={{
                                            left: `${(cropRect.x / sourceWidth) * 100}%`,
                                            top: `${(cropRect.y / sourceHeight) * 100}%`,
                                            width: `${(cropRect.w / sourceWidth) * 100}%`,
                                            height: `${(cropRect.h / sourceHeight) * 100}%`,
                                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                                            outline: "2px solid rgba(255,255,255,0.95)",
                                            outlineOffset: "-1px",
                                        }}
                                    />
                                    {/* Rule-of-thirds lines inside the crop */}
                                    <div
                                        className="absolute pointer-events-none"
                                        style={{
                                            left: `${(cropRect.x / sourceWidth) * 100}%`,
                                            top: `${(cropRect.y / sourceHeight) * 100}%`,
                                            width: `${(cropRect.w / sourceWidth) * 100}%`,
                                            height: `${(cropRect.h / sourceHeight) * 100}%`,
                                        }}
                                    >
                                        <div className="absolute inset-0 border-[0.5px] border-white/30 grid grid-cols-3 grid-rows-3">
                                            {Array.from({ length: 9 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="border-[0.5px] border-white/20"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                            {fit === "contain" && (
                                <div className="absolute inset-0 pointer-events-none ring-2 ring-dashed ring-white/60" />
                            )}
                        </div>
                    </div>
                    {imgError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {imgError}
                        </p>
                    )}
                    {smartCrop && (
                        <p className="text-[11px] rounded-md bg-primary/5 border border-primary/30 text-primary px-2 py-1 flex items-center gap-1.5">
                            {position === "attention" ? (
                                <Sparkles className="h-3 w-3 shrink-0" />
                            ) : (
                                <Scan className="h-3 w-3 shrink-0" />
                            )}
                            <span className="leading-snug">
                                Smart crop — Sharp picks the region at generate time.
                                Overlay shows the center-anchored fallback.
                            </span>
                        </p>
                    )}
                </div>

                {/* Output */}
                <div className="flex flex-col gap-1.5 min-h-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                        <span>{presetName ?? "Output"}</span>
                        <span className="font-mono normal-case text-muted-foreground/80">
                            {formatDimensions(dstWidth, dstHeight)}
                        </span>
                    </p>
                    <div className="relative flex-1 min-h-0 rounded-lg border border-border bg-[conic-gradient(at_top_left,_rgba(0,0,0,0.08)_0deg,_rgba(0,0,0,0.12)_90deg,_rgba(0,0,0,0.08)_180deg,_rgba(0,0,0,0.12)_270deg)] bg-muted/20 overflow-hidden flex items-center justify-center p-2">
                        <canvas
                            ref={canvasRef}
                            className="max-w-full max-h-full block"
                            style={{
                                aspectRatio:
                                    fit === "inside"
                                        ? undefined
                                        : `${dstWidth} / ${dstHeight}`,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
