"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { coppaService } from "@/features/education/compliance/coppaService";
import { useAgeDeclarationContent } from "@/features/education/compliance/components/AgeDeclarationDialog";
import { markAskedThisSession } from "@/features/education/compliance/FirstSignInAgeGateMount";
import { rememberAgeNotNow } from "@/features/education/compliance/ageNotNow";
import type { AgeBand } from "@/features/education/compliance/types";

/** True when the account still owes the age question (signed in, no band yet). */
export async function ageStillNeeded(): Promise<boolean> {
  const res = await coppaService.getGate();
  if (!res.data) return false; // unreadable: never block the welcome on it; the next session asks again
  return res.data.ageBand === null && res.data.reason === "age_undeclared";
}

/**
 * The age question as its own step of the sign-up welcome: same wording and over/under-18 split as the popup it
 * replaces here (useAgeDeclarationContent), one heading, "Not now" always available (the question is a nudge: the
 * account is not blocked). "Not now" is kept on the account (ageNotNow.ts), so later visits skip this step and the
 * popup elsewhere holds off too, until it runs out; the band stays undeclared and the education gate still asks.
 */
export function WelcomeAgeStep({ needed, onDone }: { needed: boolean | null; onDone: () => void }) {
  const [saving, setSaving] = useState<AgeBand | null>(null);
  const [read, setRead] = useState<boolean | null>(null);
  const resolved = needed ?? read;

  // Read once if the page has not already (never asked of someone who already answered).
  useEffect(() => {
    if (resolved !== null) return;
    let live = true;
    void ageStillNeeded().then((n) => live && setRead(n));
    return () => {
      live = false;
    };
  }, [resolved]);
  useEffect(() => {
    if (resolved === false) onDone();
  }, [resolved, onDone]);

  async function pick(band: AgeBand) {
    setSaving(band);
    const res = await coppaService.setAgeBand(band);
    if (res.error || !res.data) {
      toast.error("Could not save that. Try again, or choose Not now.");
      setSaving(null);
      return;
    }
    markAskedThisSession();
    onDone();
  }

  const { title, explainer, choices } = useAgeDeclarationContent({ onPick: (b) => void pick(b), saving, variant: "first_run" });

  if (resolved !== true) return <div className="min-h-[22rem]" data-welcome-step="age" aria-busy="true" />;

  return (
    <div className="mx-auto min-h-[22rem] w-full max-w-md" data-welcome-step="age">
      <header className="flex flex-col items-center gap-2 text-center">
        <CalendarClock className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <div className="space-y-3 text-sm text-muted-foreground">{explainer}</div>
      </header>
      <div className="mt-6 flex flex-col items-stretch gap-2">{choices}</div>
      <div className="mt-3 flex justify-center">
        <Button
          variant="quiet"
          disabled={saving !== null}
          data-testid="age-not-now"
          onClick={() => {
            markAskedThisSession();
            onDone();
            // Kept on the account so the next visit skips the step; a failed write only says so (they moved on).
            void rememberAgeNotNow().then((error) => {
              if (error) toast.error(`Could not save your choice: ${error}`);
            });
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
