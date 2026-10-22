// The `conversationRenameDialog` overlay's open-data type. Chat opens it through its windows port (CHAT_WINDOWS) with
// `{ requestId }` and awaits summon's requestOverlay; the render answers with summon's useOverlayRequest.
import type { OverlayRequestData } from "@/features/overlays/requestOverlay";
import type { OverlayWire } from "./overlay-types";

export type ConversationRenameDialogDefinitionData = OverlayRequestData;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    conversationRenameDialog: OverlayWire<ConversationRenameDialogDefinitionData>;
  }
}
