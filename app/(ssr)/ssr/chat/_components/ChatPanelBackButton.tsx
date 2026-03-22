"use client";

// ChatPanelBackButton — mobile-only back button pinned in the chat panel header.
//
// Tapping it does two things atomically:
//   1. Closes the chat sidebar (unchecks #shell-panel-mobile)
//   2. Opens the main app nav sheet (checks #shell-mobile-menu)
//
// This gives users a seamless "go back to main navigation" gesture.
// Both operations are pure DOM checkbox manipulation — zero React re-renders.

import { TapTargetButtonTransparent } from "@/app/(ssr)/_components/core/TapTargetButton";

export default function ChatPanelBackButton() {
  function handleBack() {
    const panelCheckbox = document.getElementById(
      "shell-panel-mobile",
    ) as HTMLInputElement | null;
    const menuCheckbox = document.getElementById(
      "shell-mobile-menu",
    ) as HTMLInputElement | null;

    if (panelCheckbox) panelCheckbox.checked = false;
    if (menuCheckbox) menuCheckbox.checked = true;
  }

  return (
    <TapTargetButtonTransparent
      onClick={handleBack}
      ariaLabel="Back to main navigation"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </TapTargetButtonTransparent>
  );
}
