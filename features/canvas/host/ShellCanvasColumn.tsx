"use client";

/**
 * Places the canvas column on the right edge of the window and tells the rest
 * of the page how wide it is. The shell root (and the public/link layouts)
 * read `--shell-canvas-w` and shrink by exactly that much, so the canvas owns
 * its own strip of the top edge and never sits over the header or the page.
 * Full screen keeps that inset: the column grows OVER the app, which hides
 * once the slide ends (`data-canvas-fullscreen` on <html>). Every change
 * moves on the package's motion contract (canvas-host.css).
 *
 * This file is the classic shell's GEOMETRY only; the canvas itself (surface scope, write
 * handlers, the column) is `ShellCanvasBody`, which the new app frame renders too.
 */

import { useLoadMark } from "@/lib/diagnostics/loadMark";
import { useEffect } from "react";
import { selectCanvasIsHydrated } from "@ai-matrx/canvas";
import { useCanvasColumnWidth, useCanvasState } from "@ai-matrx/canvas/react";
import { ShellCanvasBody } from "./ShellCanvasBody";

export function ShellCanvasColumn() {
  useLoadMark("Canvas column slot");
  const width = useCanvasColumnWidth();
  const hydrated = useCanvasState(selectCanvasIsHydrated);

  useEffect(() => {
    // Until the saved state lands the column's width is not known: the pre-paint reservation
    // (CanvasPrepaintScript) holds the page where the restored column will sit, so nothing moves.
    if (!hydrated) return;
    const root = document.documentElement;
    root.removeAttribute("data-canvas-reserved");
    if (width === null) {
      // Expanded: the docked inset stays, so the app does not squeeze while the column grows over it.
      root.setAttribute("data-canvas-fullscreen", "");
    } else {
      root.style.setProperty("--shell-canvas-w", `${width}px`);
      root.removeAttribute("data-canvas-fullscreen");
    }
    root.toggleAttribute("data-canvas-open", width !== 0);
  }, [width, hydrated]);

  useEffect(
    () => () => {
      const root = document.documentElement;
      root.style.removeProperty("--shell-canvas-w");
      root.removeAttribute("data-canvas-fullscreen");
      root.removeAttribute("data-canvas-open");
      root.removeAttribute("data-canvas-reserved");
    },
    [],
  );

  return (
    <ShellCanvasBody
      className="shell-canvas-column"
      onLiveWidth={(live) => {
        // The page follows the edge while it is dragged; the stored width takes over on release.
        if (live !== null) document.documentElement.style.setProperty("--shell-canvas-w", `${live}px`);
      }}
    />
  );
}
