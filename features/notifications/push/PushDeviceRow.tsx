"use client";

// features/notifications/push/PushDeviceRow.tsx
//
// "This browser" push switch in Settings → Notifications — the easy way back
// out of (or into) push for the browser the person is using. Same primitive as
// the study reminder ask (`lib/pwa/usePushDevice`); one row per browser lives in
// `communication.push_subscription`.

import { RowGroup, SettingRow, Switch } from "@ai-matrx/design-system/controls";
import { usePushDevice } from "@/lib/pwa/usePushDevice";
import { InstallStudyAppButton } from "@/features/education/components/InstallStudyAppButton";

export function PushDeviceRow() {
  const push = usePushDevice();

  if (push.availability === "unsupported" || push.availability === "not-configured") {
    return null;
  }

  if (push.availability === "ios-needs-install") {
    return (
      <RowGroup className="mb-3">
        <SettingRow label="Push on this iPhone" line="Add the app to your Home Screen first.">
          <InstallStudyAppButton />
        </SettingRow>
      </RowGroup>
    );
  }

  const line =
    push.state === "blocked"
      ? "Blocked in this browser's site settings."
      : "Study reminders and notices you route to push.";

  return (
    <RowGroup className="mb-3">
      <SettingRow label="Push in this browser" line={line} htmlFor="push-this-browser">
        <Switch
          id="push-this-browser"
          checked={push.state === "on"}
          disabled={push.busy || push.state === null || push.state === "blocked"}
          onCheckedChange={(on) => {
            void (on ? push.enable() : push.disable());
          }}
        />
      </SettingRow>
    </RowGroup>
  );
}
