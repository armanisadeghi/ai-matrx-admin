"use client";

// features/education/reminders/StudyReminderOptIn.tsx
//
// THE one ask for study reminder pushes (owner 2026-10-11, "Yes but gentle").
// Shown on a finished study session's summary — never on a first visit — and
// asked ONCE: either answer stamps `userPreferences.flashcard.studyRemindersAskedAt`
// (synced to the server), so it never shows again on any device. Turning it off
// later lives in Settings → Notifications ("This browser"), which uses the same
// primitive (`lib/pwa/usePushDevice`).
//
// iOS Safari tab: web push exists only for a Home Screen web app, so the card
// shows the Add to Home Screen door (the education install button) instead of a
// switch that would do nothing.
//
// React Compiler is on: no manual memo.

import { BellRing } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useSetting } from "@/features/settings/hooks/useSetting";
import { usePushDevice } from "@/lib/pwa/usePushDevice";
import { toast } from "@/lib/toast";
import { InstallStudyAppButton } from "@/features/education/components/InstallStudyAppButton";

export function StudyReminderOptIn() {
  const [askedAt, setAskedAt] = useSetting<string | null | undefined>(
    "userPreferences.flashcard.studyRemindersAskedAt",
  );
  const push = usePushDevice();

  if (askedAt) return null;
  if (push.state === null || push.state === "on" || push.state === "blocked") return null;
  if (push.availability === "unsupported" || push.availability === "not-configured") return null;

  const answer = () => setAskedAt(new Date().toISOString());

  if (push.availability === "ios-needs-install") {
    return (
      <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-left">
        <div className="flex items-start gap-2">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Want a gentle reminder?</p>
            <p className="text-xs text-muted-foreground">
              On iPhone, add the app to your Home Screen first.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="quiet" onClick={answer}>
            Not now
          </Button>
          <InstallStudyAppButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-left">
      <div className="flex items-start gap-2">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Want a gentle reminder?</p>
          <p className="text-xs text-muted-foreground">
            At most one a day, only when cards are due.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="quiet" onClick={answer} disabled={push.busy}>
          Not now
        </Button>
        <Button
          variant="primary"
          disabled={push.busy}
          onClick={async () => {
            const next = await push.enable();
            if (next === null) return;
            answer();
            if (next === "on") toast.success("Reminders on. Turn them off in Settings anytime.");
          }}
        >
          Remind me
        </Button>
      </div>
    </div>
  );
}
