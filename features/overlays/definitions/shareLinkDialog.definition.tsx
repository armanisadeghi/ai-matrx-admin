"use client";

// The `shareLinkDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./shareLinkDialog.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ShareLinkDialogDefinitionData } from "./shareLinkDialog.overlay";

export const shareLinkDialogOverlay = defineOverlay<ShareLinkDialogDefinitionData>()({
  id: "shareLinkDialog",
  label: "Manage Share Links",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
