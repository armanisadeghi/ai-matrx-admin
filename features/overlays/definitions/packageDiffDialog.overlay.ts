// The `packageDiffDialog` overlay's open-data type: chat's own diff view (`CHAT_WINDOWS.packageDiffDialog`),
// opened through the app's chat windows port (providers/ChatHostAdapter.tsx) by chat's `openDiffView`.
// The app registers `openDiffViewerWindow`, so chat opens its own diff window instead; the id is declared
// so every `ChatWindowId` has an overlay here.
import type { OverlayWire } from "./overlay-types";

export interface PackageDiffDialogDefinitionData {
  original?: string;
  modified?: string;
  originalLabel?: string;
  modifiedLabel?: string;
  title?: string;
  language?: string;
  defaultView?: string;
}

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    packageDiffDialog: OverlayWire<PackageDiffDialogDefinitionData>;
  }
}
