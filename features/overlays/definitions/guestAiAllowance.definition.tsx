"use client";

// The `guestAiAllowance` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./guestAiAllowance.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GuestAiAllowanceDefinitionData } from "./guestAiAllowance.overlay";

export const guestAiAllowanceOverlay = defineOverlay<GuestAiAllowanceDefinitionData>()({
  id: "guestAiAllowance",
  label: "Guest AI Allowance Reminder",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
