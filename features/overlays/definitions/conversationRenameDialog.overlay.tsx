// The `conversationRenameDialog` overlay's open-data type. An awaitable dialog: chat's opener asks it through the chat
// dialog request port the app registers (features/overlays/chatDialogPorts.ts → requestOverlay).
import type { OverlayRequestData } from "@/features/overlays/requestOverlay";
import type { OverlayWire } from "./overlay-types";

export type ConversationRenameDialogDefinitionData = OverlayRequestData;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    conversationRenameDialog: OverlayWire<ConversationRenameDialogDefinitionData>;
  }
}
