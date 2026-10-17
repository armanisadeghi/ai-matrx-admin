"use client";

/**
 * The overlay world: every app overlay rendered by its definition (one subscriber per overlay).
 * Loaded only through app/DeferredOverlayWorld.tsx; window options and tray sync are mounted at
 * the app root (AppSummonProvider).
 */
import { SummonHost } from "@ai-matrx/summon/react";
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";
import "@/features/overlays/definitions/trayPreviews";

export function OverlayWorldHost() {
  return <SummonHost definitions={APP_OVERLAYS} />;
}
