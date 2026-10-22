"use client";

/**
 * A source's usual speed on its card ("Usually ~2 min"), from real history: the median of its latest finished runs
 * (`./runTiming`). Plain words, no cost. A source with fewer than two finished runs shows nothing (no guess).
 */

import { Timer } from "lucide-react";

import { usuallyWords, useTypicalSpeed } from "./runTiming";

export function SourceSpeed({ sourceKey }: { sourceKey: string }) {
  const speed = useTypicalSpeed(sourceKey);
  if (!speed) return null;
  return (
    <span className="type-meta inline-flex items-center gap-1 text-muted-foreground" data-source-speed={speed.typicalMs}>
      <Timer className="h-3 w-3 shrink-0" aria-hidden />
      {usuallyWords(speed.typicalMs)}
    </span>
  );
}
