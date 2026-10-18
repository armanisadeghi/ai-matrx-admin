import { registerOverlayMeta } from "@ai-matrx/summon/open";
import { APP_OVERLAYS } from "./registry";

let registered = false;

/**
 * Registers every app overlay's metadata with the package registry (links, persistence and
 * window metadata read it). Idempotent; SummonHost registers the same list again on mount.
 */
export function ensureAppOverlaysRegistered(): void {
  if (registered) return;
  registered = true;
  registerOverlayMeta(APP_OVERLAYS);
}

/** The app definition for an overlay id (label, instance, window options), registered or not. */
export function appOverlayDefinition(overlayId: string) {
  return APP_OVERLAYS.find((d) => d.id === overlayId);
}
