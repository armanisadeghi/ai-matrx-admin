"use client";

/**
 * Inside a page framed by a board (a Page tile, `<html data-board-embed>`):
 * hand this page's surface to the board (framed-surface-bridge.ts). Renders
 * nothing; on every other page it does nothing at all.
 */

import { useEffect } from "react";
import { getGlobalSurfaceRegistry } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { installFramedSurfaceBridge } from "./framed-surface-bridge";

export function BoardEmbedSurfaceBridge() {
  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-board-embed")) return;
    return installFramedSurfaceBridge(window, getGlobalSurfaceRegistry());
  }, []);
  return null;
}
