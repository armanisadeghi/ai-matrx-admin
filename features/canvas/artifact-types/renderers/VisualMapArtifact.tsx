"use client";

/**
 * `visual_map` (canvasType "visual_map") — the engine-checked diagram kind. The value
 * (`{type, spec, verified, issues, ...}`, an object or its JSON text) goes to rich-content's ONE
 * `VisualMap`, so chat and canvas draw the same picture with the same honest chip.
 */

import VisualMap from "@ai-matrx/rich-content/visual-map/VisualMap";
import type { ArtifactRendererProps } from "../types";

function valueOf(data: unknown, serverData: unknown, raw: string | undefined): unknown {
  for (const candidate of [data, serverData]) {
    if (candidate && typeof candidate === "object") return candidate;
  }
  const text = typeof data === "string" ? data : raw;
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export default function VisualMapArtifact({ data, serverData, raw, isStreamActive, mode }: ArtifactRendererProps) {
  return (
    <div className={mode === "canvas" ? "h-full overflow-auto p-3" : undefined}>
      <VisualMap
        value={valueOf(data, serverData, raw)}
        streaming={Boolean(isStreamActive)}
        openOnCanvas={mode !== "canvas"}
        fillHeight={mode === "canvas"}
      />
    </div>
  );
}
