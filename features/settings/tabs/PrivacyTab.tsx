"use client";

import { useMemo } from "react";
import { ShieldCheck, Lightbulb, DatabaseZap } from "lucide-react";
import { toast } from "@/lib/toast";
import { SettingsSection } from "@ai-matrx/design-system/settings";
import { SettingsSubHeader } from "@ai-matrx/design-system/settings";
import { SettingsSwitch } from "@ai-matrx/design-system/settings";
import { SettingsButton } from "@ai-matrx/design-system/settings";
import { SettingsLink } from "@ai-matrx/design-system/settings";
import { settingDoorHref } from "../doors/settingDoorTarget";
import { useAutoRagPreference } from "@/features/kg-suggestions/hooks/useAutoRagPreference";
import { toastWriteFailure } from "@/lib/errors/toastWriteFailure";
import { useUniversalSettings } from "../universal/UniversalSettingsContext";
import { UniversalSettingsRows } from "../universal/UniversalSettingsPane";

// Knob (feature `conversation_context.identity`): whether the server tells the person's agents
// what they saved about themselves. Organization sets the default, the person's own value wins.
export const SHARE_PROFILE_KNOB_KEY = "conversation_context.identity.share_profile_with_agents";

/**
 * Privacy-adjacent controls. Not a dedicated slice — points at the fields
 * from assistant + messaging that involve data collection or background
 * capture, each through a door to its one real home so the switch and the
 * side effect it needs (e.g. the browser notification permission prompt)
 * never drift apart. Fixed 2026-09-25 (settings-truth-sweep, lane general):
 * this tab used to carry its own raw "Desktop notifications" switch that set
 * `messaging.showDesktopNotifications` to true WITHOUT ever requesting the
 * browser's Notification permission — `showDesktopNotification()` silently
 * no-ops unless `Notification.permission === "granted"`, so flipping it here
 * looked like it worked and never showed a notification. Only the Messaging
 * tab's switch calls `requestNotificationPermission()` first.
 */
export default function PrivacyTab() {
  const autoRag = useAutoRagPreference();
  const settings = useUniversalSettings();
  const shareProfile = settings.knobByKey(SHARE_PROFILE_KNOB_KEY);
  // UniversalSettingsRows prints its own group heading from the key's `ui.group`
  // (the registry files this key under "Privacy", which repeats this tab's title),
  // so the row is handed over under this section's name with a one-line description
  // and is NOT wrapped in a second SettingsSection. The full text stays in the help.
  const agentsKnobs = useMemo(
    () =>
      shareProfile
        ? [
            {
              ...shareProfile,
              description: "Your agents see your name, work and links",
              ui: {
                ...shareProfile.ui,
                group: "Your agents",
                help: [shareProfile.description, shareProfile.ui.help].filter(Boolean).join(" "),
              },
            },
          ]
        : [],
    [shareProfile],
  );

  const handleAutoRagChange = (next: boolean) => {
    void autoRag
      .setEnabled(next)
      .then((effective) =>
        effective === next
          ? toast.success(
              next
                ? "Auto knowledge-graph enabled"
                : "Auto knowledge-graph disabled",
            )
          : // The organization's rung overruled this one and the switch did NOT
            // move. Saying "enabled" here would be a control that lies.
            toast.info("Your organization keeps this off"),
      )
      .catch((err) =>
        toastWriteFailure(err, {
          action: next ? "turn on auto knowledge-graph" : "turn off auto knowledge-graph",
        }),
      );
  };

  return (
    <>
      <SettingsSubHeader
        title="Privacy"
        description="Permissions and background data capture."
        icon={ShieldCheck}
      />

      <SettingsSection title="Notifications">
        <SettingsLink
          label="Desktop notifications"
          description="New-message banners on your desktop."
          helpText="Set on the Messaging tab, where turning it on asks your browser for permission."
          href={settingDoorHref({
            scope: "user",
            tabId: "communication.messaging",
            controlId: "settings-control-desktop-desktop-notifications",
          })}
          actionLabel="Messaging"
          last
        />
      </SettingsSection>

      {agentsKnobs.length > 0 ? (
        <UniversalSettingsRows knobs={agentsKnobs} hideKey />
      ) : (
        // Never absent: the server treats an unread setting as OFF, so the person must see why there is no switch.
        <SettingsSection title="Your agents">
          {settings.isLoading ? (
            <SettingsSwitch
              label="Share my profile with my agents"
              description="Loading your setting."
              checked={false}
              onCheckedChange={() => undefined}
              disabled
              last
            />
          ) : (
            <SettingsButton
              label="Share my profile with my agents"
              description={
                settings.error
                  ? "Could not load, so your agents see nothing."
                  : "Not available now, so your agents see nothing."
              }
              actionLabel="Retry"
              onClick={settings.refresh}
              last
            />
          )}
        </SettingsSection>
      )}

      <SettingsSection title="Your data" icon={DatabaseZap}>
        <SettingsLink
          label="Trash"
          description="Deleted items and when they go for good."
          href="/trash"
          actionLabel="Open"
          last
        />
      </SettingsSection>

      <SettingsSection title="Knowledge Graph" icon={Lightbulb}>
        <SettingsSwitch
          label="Auto knowledge-graph"
          description="In this organization: finds links you then accept."
          checked={autoRag.enabled}
          onCheckedChange={handleAutoRagChange}
          // `canChange` is false with no signed-in person or no organization to
          // write the rung for. Leaving it pressable let someone turn a switch
          // that wrote nothing and still be told it saved.
          disabled={autoRag.loading || autoRag.saving || !autoRag.canChange}
          last
        />
      </SettingsSection>
    </>
  );
}
