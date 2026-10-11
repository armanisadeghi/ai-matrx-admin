"use client";

import React from "react";
import { canvasItemsService } from "@/features/canvas/services/canvasItemsService";
import type { PlaygroundDemo } from "./types";

/**
 * A real record for a demo that saves onto its item: one canvas item per demo
 * per person (`kind_value`, deduped on content, so every visit reuses it). The
 * card hosts block state on it, exactly as a canvas item hosts a shape.
 */
export function useDemoItemHost(demo: PlaygroundDemo): { canvasItemId: string | null; error: string | null } {
  const [state, setState] = React.useState<{ canvasItemId: string | null; error: string | null }>({
    canvasItemId: null,
    error: null,
  });
  const wanted = Boolean(demo.savesItemState);
  React.useEffect(() => {
    if (!wanted) return undefined;
    let live = true;
    void canvasItemsService
      .save({
        content: { type: "kind_value", data: { __kind: demo.slug, ...demo.sample } },
        title: `Shape playground: ${demo.title}`,
        tags: ["shape-playground"],
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (data) setState({ canvasItemId: data.id, error: null });
        else {
          const message =
            (error as { message?: string } | null)?.message ?? "Could not create the demo record";
          console.error(`[shape-playground] ${demo.slug}: ${message}`);
          setState({ canvasItemId: null, error: message });
        }
      });
    return () => {
      live = false;
    };
  }, [wanted, demo]);
  return state;
}
