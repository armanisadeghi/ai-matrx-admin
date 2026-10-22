"use client";

import { Activity, Megaphone } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/redux/store";
import { SettingsSection } from "@ai-matrx/design-system/settings";
import { SettingsSubHeader } from "@ai-matrx/design-system/settings";
import { SettingsReadOnlyValue } from "@ai-matrx/design-system/settings";
import { SettingsCallout } from "@ai-matrx/design-system/settings";
import { PreferencesLoadGate } from "@/components/read-state/PreferencesLoadGate";

export default function SystemTab() {
  const viewedAnnouncements = useSelector(
    (s: RootState) => s.userPreferences.system?.viewedAnnouncements ?? [],
  );
  const feedbackViews = useSelector(
    (s: RootState) => s.userPreferences.system?.feedbackFeatureViewCount ?? 0,
  );

  return (
    <>
      <SettingsSubHeader
        title="System"
        description="Usage counters and tracking fields used by in-app onboarding."
        icon={Activity}
      />

      <SettingsCallout tone="info">
        These values are maintained automatically by the product — you rarely
        need to look at them. They're shown here for transparency.
      </SettingsCallout>

      <PreferencesLoadGate what="your usage counters">
        <SettingsSection title="Announcements" icon={Megaphone}>
          <SettingsReadOnlyValue
            label="Announcements viewed"
            description="Unique announcement IDs you've dismissed."
            value={String(viewedAnnouncements.length)}
          />
          <SettingsReadOnlyValue
            label="Feedback prompts seen"
            description="How many times the feedback callout has appeared."
            value={String(feedbackViews)}
            last
          />
        </SettingsSection>
      </PreferencesLoadGate>
    </>
  );
}
