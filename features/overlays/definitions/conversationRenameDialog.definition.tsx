"use client";

// The `conversationRenameDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through chat's opener, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ConversationRenameDialogDefinitionData } from "./conversationRenameDialog.overlay";

export const conversationRenameDialogOverlay = defineOverlay<ConversationRenameDialogDefinitionData>()({
  id: "conversationRenameDialog",
  label: "Rename conversation",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
