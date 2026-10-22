"use client";

import { PartyPopper } from "lucide-react";
import { SettingsCallout } from "@ai-matrx/design-system/settings";
import { SettingsSubHeader } from "@ai-matrx/design-system/settings";

export default function PlaceholderTab() {
  return (
    <>
      <SettingsSubHeader
        title="No settings here yet"
        description="This category has no controls available yet."
        icon={PartyPopper}
      />
      <SettingsCallout tone="info">
        Settings for this category are not available yet.
      </SettingsCallout>
    </>
  );
}
