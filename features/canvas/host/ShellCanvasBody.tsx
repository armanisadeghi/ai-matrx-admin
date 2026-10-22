"use client";

/**
 * THE CANVAS, WITH NO GEOMETRY (app-frame P3, 2026-10-21): the surface scope, the write handlers,
 * the scope-change announcement and the package's `CanvasColumn`. Two hosts render it:
 *   - the classic shell's `ShellCanvasColumn` (the right-edge column, `--shell-canvas-w` and the
 *     `<html>` attributes — geometry that stays with the classic shell);
 *   - the new app frame's canvas panel (`placement="fill"`: the frame owns width, full screen and
 *     the header band), loaded only when the canvas is first opened.
 */

import "@ai-matrx/canvas/styles.css";
import "@ai-matrx/canvas/tokens.css";
import "./canvas-host.css";
import { useEffect } from "react";
import { CanvasColumn, useCanvas, type CanvasColumnProps } from "@ai-matrx/canvas/react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { announceSurfaceScopeChange } from "@ai-matrx/chat/surfaces/runtime/surface-chain";
import { CANVAS_SURFACE_NAME } from "@/features/surfaces/manifests/canvas.surface";
import { useCanvasSurfaceScope } from "./canvasSurfaceScope";
import { canvasWriteHandlers } from "./canvasWriteHandlers";

export function ShellCanvasBody(column: CanvasColumnProps) {
  const getScope = useCanvasSurfaceScope();
  const canvas = useCanvas();
  // Fresh handlers per call (the getWriteHandlers contract): each reads the
  // canvas store when the write applies.
  const getWriteHandlers = () => canvasWriteHandlers(canvas);

  // The canvas's values change without re-registering (a tab switched, an item
  // opened or saved): say so, so the composer's value list re-reads them
  // before the first send. Only a NEW canvas state announces — the store is
  // the app's Redux store, which notifies on every action.
  useEffect(() => {
    let last = canvas.getState();
    return canvas.store.subscribe(() => {
      const next = canvas.getState();
      if (next === last) return;
      last = next;
      announceSurfaceScopeChange();
    });
  }, [canvas]);

  return (
    <SurfaceRuntimeProvider surfaceName={CANVAS_SURFACE_NAME} getScope={getScope} getWriteHandlers={getWriteHandlers}>
      <CanvasColumn {...column} />
    </SurfaceRuntimeProvider>
  );
}

export default ShellCanvasBody;
