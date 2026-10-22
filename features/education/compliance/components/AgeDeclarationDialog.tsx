// features/education/compliance/components/AgeDeclarationDialog.tsx
//
// THE one-tap age-band prompt. Two callers, one dialog, never a fork:
//   - `FirstSignInAgeGateMount` — the post-sign-in popup (variant "first_run").
//   - `useAiComplianceGate` — the inline gate on an AI action (variant "gate").
//
// SHAPE (Arman, 2026-08-20): "the main thing is if they're over eighteen or
// not." So step one asks exactly that, in two buttons — an adult, which is
// almost everyone, answers in ONE tap and never reads a band list. Only someone
// who says "under 18" is shown the finer split (13-17 vs under 13), because
// that distinction is load-bearing for COPPA and for nobody else. The stored
// values are unchanged (`under_13` / `13_17` / `adult`); this is presentation.
//
// This is a step, never a wall: picking a band writes it, re-checks the gate,
// and the caller resumes. An under-13 pick hands off to AiConsentRequiredDialog
// (a parent must approve).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2 } from "lucide-react";
import { AUTH_DEST_PARAM } from "@/utils/auth/auth-destination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { Button } from "@ai-matrx/design-system";
import type { AgeBand } from "../types";

/** Which caller opened it — drives copy only, never the write path. */
export type AgeDeclarationVariant = "first_run" | "gate";

/** Step one asks the only question that matters; step two splits the minors. */
type Step = "over_under_18" | "minor_band";

const MINOR_BANDS: { value: Exclude<AgeBand, "adult">; label: string }[] = [
  { value: "13_17", label: "13–17" },
  { value: "under_13", label: "Under 13" },
];

/**
 * The question itself (title, explainer, choices) — ONE source for the dialog and the sign-up welcome step,
 * so the wording and the over/under-18 then minor split can never fork.
 */
export function useAgeDeclarationContent({
  open = true,
  onPick,
  saving,
  isGuest = false,
  variant = "gate",
}: {
  /** Resets to the top question each time this turns true. Default: always on. */
  open?: boolean;
  onPick: (band: AgeBand) => void;
  /** The band currently being written, so its button shows the spinner. */
  saving: AgeBand | null;
  /**
   * A guest (anonymous) session. Adds a "sign in" path alongside declaring —
   * a guest can either tell us their age here or sign into an existing account.
   */
  isGuest?: boolean;
  /**
   * `first_run` is the post-sign-in popup: nothing is waiting on the answer, so
   * the copy says "we ask once" and does not promise to resume anything.
   * `gate` is the inline prompt in front of an AI action the user just started.
   */
  variant?: AgeDeclarationVariant;
}) {
  const [step, setStep] = useState<Step>("over_under_18");
  const busy = saving !== null;
  const pathname = usePathname();
  const signInHref = `/login?${AUTH_DEST_PARAM}=${encodeURIComponent(pathname ?? "/education")}`;

  // Every open starts at the top question. Without this, a user who dismissed
  // on the minor step would be re-opened straight into "13-17 / Under 13" with
  // no memory of how they got there.
  useEffect(() => {
    if (open) setStep("over_under_18");
  }, [open]);

  const title =
    step === "minor_band" ? "Which age range?" : "How old are you?";

  const explainer =
    step === "minor_band" ? (
      <span className="block">
        Under 13 needs a parent or guardian to approve before AI features turn
        on (COPPA).
      </span>
    ) : (
      <>
        <span className="block">
          We ask once, as a range, never your birth date. It sets the right
          privacy protections for your account.
        </span>
        {variant === "gate" ? (
          <span className="block">
            Answer below and we&apos;ll pick up right where you left off.
          </span>
        ) : null}
        {isGuest ? (
          <span className="block text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={signInHref}
              className="font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
            .
          </span>
        ) : null}
      </>
    );

  const choices =
    step === "minor_band" ? (
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          {MINOR_BANDS.map((b) => (
            <Button
              key={b.value}
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => onPick(b.value)}
            >
              {saving === b.value ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {b.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
          disabled={busy}
          onClick={() => setStep("over_under_18")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>
    ) : (
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          disabled={busy}
          onClick={() => onPick("adult")}
        >
          {saving === "adult" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          I&apos;m 18 or older
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => setStep("minor_band")}
        >
          I&apos;m under 18
        </Button>
      </div>
    );

  return { title, explainer, choices, busy };
}

/**
 * The same question as a NON-BLOCKING card that floats over the page (no overlay, no focus trap, nothing behind it
 * goes inert). Used by the site-wide first-sign-in prompt: a nudge, never a wall (Arman, 2026-10-17: nothing may
 * block a new person's way in). "Not now" closes it; the caller holds that for the session.
 */
export function AgeDeclarationNudge({
  open,
  onOpenChange,
  ...rest
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (band: AgeBand) => void;
  saving: AgeBand | null;
  isGuest?: boolean;
  variant?: AgeDeclarationVariant;
}) {
  const { title, choices, busy } = useAgeDeclarationContent({ open, ...rest });
  if (!open) return null;
  return (
    <aside
      role="region"
      aria-label={title}
      data-testid="age-nudge"
      data-matrx-floating-bottom
      className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" aria-hidden />
        <p className="type-body font-medium text-foreground">{title}</p>
      </div>
      {choices}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={busy} data-testid="age-nudge-not-now" onClick={() => onOpenChange(false)}>
          Not now
        </Button>
      </div>
    </aside>
  );
}

export function AgeDeclarationDialog({
  open,
  onOpenChange,
  ...rest
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (band: AgeBand) => void;
  saving: AgeBand | null;
  isGuest?: boolean;
  variant?: AgeDeclarationVariant;
}) {
  const isMobile = useIsMobile();
  const { title, explainer, choices, busy } = useAgeDeclarationContent({ open, ...rest });

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={busy ? undefined : onOpenChange}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <div className="mb-1 flex items-center justify-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <DrawerTitle>{title}</DrawerTitle>
            </div>
            <DrawerDescription className="space-y-3 pt-1 text-left">
              {explainer}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>{choices}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 pt-1 text-left">
            {explainer}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>{choices}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
