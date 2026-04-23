"use client";

import { Sparkles } from "lucide-react";
import { SettingsCallout, SettingsSubHeader } from "@/components/official/settings";

/**
 * Placeholder tab used for every registry entry in Phase 3.
 * Replaced by real tabs under `features/settings/tabs/*` starting Phase 5.
 */
export default function PlaceholderTab() {
  return (
    <>
      <SettingsSubHeader
        title="Coming soon"
        description="This tab will be implemented by a later migration phase."
        icon={Sparkles}
      />
      <SettingsCallout tone="info">
        Tab components compose only primitives from
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">
          @/components/official/settings
        </code>
        and read/write state only through
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">
          useSetting()
        </code>
        .
      </SettingsCallout>
    </>
  );
}
