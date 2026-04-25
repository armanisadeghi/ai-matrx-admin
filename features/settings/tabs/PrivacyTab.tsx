"use client";

import { ShieldCheck, Eye } from "lucide-react";
import { SettingsSwitch } from "@/components/official/settings/primitives/SettingsSwitch";
import { SettingsSection } from "@/components/official/settings/layout/SettingsSection";
import { SettingsSubHeader } from "@/components/official/settings/layout/SettingsSubHeader";
import { SettingsCallout } from "@/components/official/settings/layout/SettingsCallout";
import { useSetting } from "../hooks/useSetting";

/**
 * Privacy-adjacent toggles. Not a dedicated slice — surfaces fields from
 * assistant + messaging that involve data collection or background capture.
 */
export default function PrivacyTab() {
  const [alwaysWatching, setAlwaysWatching] = useSetting<boolean>(
    "userPreferences.assistant.alwaysWatching",
  );
  const [showDesktopNotifications, setShowDesktopNotifications] =
    useSetting<boolean>("userPreferences.messaging.showDesktopNotifications");

  return (
    <>
      <SettingsSubHeader
        title="Privacy"
        description="Permissions and background data capture."
        icon={ShieldCheck}
      />

      <SettingsCallout tone="info">
        Granular telemetry and export settings aren't implemented yet. This tab
        surfaces the two capture-related preferences that exist today.
      </SettingsCallout>

      <SettingsSection title="Assistant" icon={Eye}>
        <SettingsSwitch
          label="Always watching"
          description="Allow the assistant to observe screen context even when not invoked."
          warning="Consumes more resources and may share more context with your provider."
          checked={alwaysWatching}
          onCheckedChange={setAlwaysWatching}
          last
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsSwitch
          label="Desktop notifications"
          description="Show OS-level banners for new messages."
          checked={showDesktopNotifications}
          onCheckedChange={setShowDesktopNotifications}
          last
        />
      </SettingsSection>
    </>
  );
}
