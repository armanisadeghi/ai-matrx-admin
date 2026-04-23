"use client";

/**
 * CropControls — fit-mode + focal-point picker for the studio.
 *
 * Layout:
 *   1. Three fit-mode buttons: Cover | Contain | Inside
 *   2. When "Cover" is active → 3×3 focal-point grid + "Smart" row
 *   3. A live explainer beneath both so the user knows what will happen
 *
 * Used globally from ExportPanel. Later can be reused per-file for overrides.
 */

import React from "react";
import {
    Aperture,
    Crop,
    Maximize2,
    Scan,
    Scaling,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageFit, ImagePosition } from "../types";

interface CropControlsProps {
    fit: ImageFit;
    position: ImagePosition;
    onFitChange: (fit: ImageFit) => void;
    onPositionChange: (position: ImagePosition) => void;
}

const FIT_OPTIONS: Array<{
    id: ImageFit;
    label: string;
    blurb: string;
    icon: React.ReactNode;
}> = [
    {
        id: "cover",
        label: "Cover",
        blurb: "Fill the frame — crops overflow. Best for hero/social images.",
        icon: <Crop className="h-3.5 w-3.5" />,
    },
    {
        id: "contain",
        label: "Contain",
        blurb: "Fit the whole image; pad with background. Best for logos and flyers.",
        icon: <Maximize2 className="h-3.5 w-3.5" />,
    },
    {
        id: "inside",
        label: "Inside",
        blurb: "Shrink to fit without cropping or padding. Output may be smaller than the preset.",
        icon: <Scaling className="h-3.5 w-3.5" />,
    },
];

const POSITION_GRID: Array<{ id: ImagePosition; label: string }> = [
    { id: "top-left", label: "Top-left" },
    { id: "top", label: "Top" },
    { id: "top-right", label: "Top-right" },
    { id: "left", label: "Left" },
    { id: "center", label: "Center" },
    { id: "right", label: "Right" },
    { id: "bottom-left", label: "Bottom-left" },
    { id: "bottom", label: "Bottom" },
    { id: "bottom-right", label: "Bottom-right" },
];

const SMART_OPTIONS: Array<{
    id: ImagePosition;
    label: string;
    blurb: string;
    icon: React.ReactNode;
}> = [
    {
        id: "attention",
        label: "Attention",
        blurb: "Crops toward the most visually prominent area (faces, high contrast).",
        icon: <Sparkles className="h-3 w-3" />,
    },
    {
        id: "entropy",
        label: "Entropy",
        blurb: "Crops toward the region with the most detail / texture.",
        icon: <Scan className="h-3 w-3" />,
    },
];

export function CropControls({
    fit,
    position,
    onFitChange,
    onPositionChange,
}: CropControlsProps) {
    const activeFit = FIT_OPTIONS.find((f) => f.id === fit);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Aperture className="h-3 w-3" />
                    Crop & fit
                </label>
            </div>

            {/* Fit mode */}
            <div className="grid grid-cols-3 gap-1.5">
                {FIT_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onFitChange(opt.id)}
                        title={opt.blurb}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-[11px] font-medium transition-colors",
                            fit === opt.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:bg-muted/40",
                        )}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
                {activeFit?.blurb}
            </p>

            {/* Position picker — only when fit = "cover" */}
            {fit === "cover" && (
                <div className="space-y-2 pt-1 border-t border-border">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Focal point
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        Which part of the image should stay anchored when the preset
                        aspect ratio forces a crop?
                    </p>

                    {/* 3×3 grid */}
                    <div className="inline-flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-2">
                        <div className="grid grid-cols-3 gap-1">
                            {POSITION_GRID.map((p) => {
                                const active = position === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => onPositionChange(p.id)}
                                        title={p.label}
                                        className={cn(
                                            "h-7 w-7 rounded-md border transition-all flex items-center justify-center",
                                            active
                                                ? "border-primary bg-primary shadow-sm"
                                                : "border-border bg-background hover:bg-muted",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                active
                                                    ? "bg-primary-foreground"
                                                    : "bg-muted-foreground/60",
                                            )}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] font-medium text-center tabular-nums">
                            {POSITION_GRID.find((p) => p.id === position)?.label ??
                                (position === "attention"
                                    ? "Smart — Attention"
                                    : position === "entropy"
                                      ? "Smart — Entropy"
                                      : "")}
                        </p>
                    </div>

                    {/* Smart crop options */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                            Or let Sharp decide
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {SMART_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onPositionChange(opt.id)}
                                    title={opt.blurb}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                                        position === opt.id
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-background hover:bg-muted/40",
                                    )}
                                >
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(fit === "contain" || fit === "inside") && (
                <p className="text-[11px] text-muted-foreground leading-snug rounded-md bg-muted/30 border border-border px-2 py-1.5">
                    {fit === "contain"
                        ? "Padding is filled with the transparent-fill colour above."
                        : "Smaller output means no cropping, no padding — useful for previews."}
                </p>
            )}
        </div>
    );
}
