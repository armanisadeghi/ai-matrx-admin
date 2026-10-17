"use client";

/**
 * The overlay world: every app overlay rendered by its definition (one subscriber per overlay).
 * Loaded only through app/DeferredOverlayWorld.tsx; window options and tray sync are mounted at
 * the app root (AppSummonProvider). The ONLY importer of render-map.ts: definitions carry no
 * `render`, so every import() edge to a window lives behind this lazily loaded host
 * (check:import-fanout enforces it).
 */
import { SummonHost } from "@ai-matrx/summon/react";
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";
import { RENDER_MAP } from "@/features/overlays/definitions/render-map";
import "@/features/overlays/definitions/trayPreviews";

export function OverlayWorldHost() {
  return <SummonHost definitions={APP_OVERLAYS} renders={RENDER_MAP} />;
}
