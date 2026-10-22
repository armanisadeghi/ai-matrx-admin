// The `packageDiffDialog` overlay's open-data type. Chat opens it through its windows port (CHAT_WINDOWS) with the
// two texts to compare; the render module ships in @ai-matrx/chat.
import type { OverlayWire } from "./overlay-types";

export type PackageDiffDialogDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    packageDiffDialog: OverlayWire<PackageDiffDialogDefinitionData>;
  }
}
