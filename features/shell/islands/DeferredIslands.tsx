"use client";


// NOTE: Voice-pad-slice overlays (`voicePad`, `voicePadAdvanced`, `transcriptionCleanup`)
// are mounted exclusively by the summon overlay host now. The legacy
// <VoicePadWrapper /> mount used to live here and double-rendered every
// open voice-pad instance because the registry was already mounting it.
// Do NOT add a wrapper here — define the overlay in
// `features/overlays/definitions/<id>.overlay.ts (window block)` and let
// the SummonHost handle it. (Bug found 2026-04-29.)

// ⌘K "Search your knowledge" — a keydown listener and the overlay opener,
// nothing else. The bar itself loads behind the overlay controller's single
// lazy edge the first time it opens.
import CommandBarHotkey from "@/features/knowledge/command-bar/CommandBarHotkey";
// Over-the-organization-cap reminder: renders nothing, raises one toast per
// browser session while the person is over their cap.
import { OrganizationCapReminder } from "@/features/organizations/limits/OrganizationCapReminder";


export default function DeferredIslands() {
  return (
    <>
      <CommandBarHotkey />
      <OrganizationCapReminder />
    </>
  );
}
