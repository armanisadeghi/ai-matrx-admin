// The `homePickerDialog` overlay's open-data type. An awaitable dialog: callers never open it directly, they call
// `pickHome(...)`, which awaits the answer through `requestOverlay` (features/overlays/requestOverlay.ts).
import type { OverlayRequestData } from "@/features/overlays/requestOverlay";
import type { OverlayWire } from "./overlay-types";

export type HomePickerDialogDefinitionData = OverlayRequestData;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    homePickerDialog: OverlayWire<HomePickerDialogDefinitionData>;
  }
}
