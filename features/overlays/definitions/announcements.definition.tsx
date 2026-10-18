"use client";

// The `announcements` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./announcements.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AnnouncementsDefinitionData } from "./announcements.overlay";

export const announcementsOverlay = defineOverlay<AnnouncementsDefinitionData>()({
  id: "announcements",
  label: "Announcements",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
