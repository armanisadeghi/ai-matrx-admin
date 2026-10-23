// The `clipboardFallbackDialog` overlay's open-data type. Callers never open it directly: they call
// `showManualCopy(...)`, which asks through `requestOverlay` (features/overlays/requestOverlay.ts).
import type { OverlayRequestData } from "@/features/overlays/requestOverlay";
import type { OverlayWire } from "./overlay-types";

export type ClipboardFallbackDialogDefinitionData = OverlayRequestData;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    clipboardFallbackDialog: OverlayWire<ClipboardFallbackDialogDefinitionData>;
  }
}
