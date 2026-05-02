"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Recent timestamps (ms epoch) — newest last. */
  timestamps: number[];
  /** Window in seconds to bucket within. */
  windowSeconds?: number;
  /** Number of buckets (= width data points). */
  buckets?: number;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Tiny inline SVG sparkline — bins recent completion timestamps into N buckets
 * and draws a polyline. Pure SVG, no library, no animation. Updates each render.
 */
export function Sparkline({
  timestamps,
  windowSeconds = 30,
  buckets = 20,
  width = 80,
  height = 16,
  className,
}: Props) {
  const path = useMemo(() => {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const bucketSize = (windowSeconds * 1000) / buckets;
    const counts = new Array<number>(buckets).fill(0);
    for (const t of timestamps) {
      if (t < cutoff) continue;
      const idx = Math.min(buckets - 1, Math.floor((t - cutoff) / bucketSize));
      counts[idx]++;
    }
    const max = Math.max(1, ...counts);
    const stepX = width / Math.max(1, buckets - 1);
    return counts
      .map((c, i) => {
        const x = i * stepX;
        const y = height - (c / max) * (height - 2) - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [timestamps, windowSeconds, buckets, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
