import type { ComponentResolution } from "@ai-matrx/content-ir-react";
import type { PlaygroundDemo } from "./types";

/** A short, stable hash of the source — the compile cache's version key. */
function sourceVersion(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i += 1) hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/**
 * The demo as the renderer receives a stored component: a db row with its body.
 * Editing the source changes `updatedAt`, so the compile cache and the frame's
 * transform cache re-key exactly as they do for a saved row.
 */
export function demoResolution(demo: PlaygroundDemo): ComponentResolution {
  return {
    componentKey: demo.slug,
    source: "db",
    config: { label: demo.title },
    isActive: true,
    resolvedBy: "db",
    componentSource: demo.source,
    propsTransform: null,
    hasComponentSource: true,
    pinnedKindVersion: null,
    updatedAt: `playground-${sourceVersion(demo.source)}`,
    createdBy: null,
  };
}
