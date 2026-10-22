"use client";

// The `shareWithPeopleDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through `shareWithPeople(...)`, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ShareWithPeopleDialogDefinitionData } from "./shareWithPeopleDialog.overlay";

export const shareWithPeopleDialogOverlay = defineOverlay<ShareWithPeopleDialogDefinitionData>()({
  id: "shareWithPeopleDialog",
  label: "Share",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
