"use client";

// features/connectors/ConsentFailureNotice.tsx
//
// WHAT A FAILED PRESS LOOKS LIKE — one sentence the person can act on, with the
// server's own words one click away and never inline.
//
// The defect this exists to end (VERIFY-U-P2-R2, N4): both consent surfaces
// rendered `extractErrorMessage(cause)` verbatim, so the hub's refusal — "None
// of the selected Google products is available to this account yet: calendar
// (google_oauth_internal_test_required)" — put a capability key and a machine
// code on the screen of a non-technical person. The sentence now comes from the
// provider adapter's one translator (`consentFailureAnswer`), and the raw text
// lives behind a REAL button, not a hover: on a phone there is no hover, so a
// tooltip is no disclosure at all (the same rule as `ProductPermissions`).
//
// Provider-agnostic: it takes the translated answer, never an error.

import { useEffect, useId, useState } from "react";
import { AlertTriangle, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsentFailureAnswer } from "./google-adapter";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export function ConsentFailureNotice({
  failure,
  className,
  action,
}: {
  failure: ConsentFailureAnswer;
  className?: string;
  action?: { label: string; onPress: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Both consent surfaces can be on screen at once (Settings mounts the panel's
  // own notice AND the dialog body), so the disclosure's id is per instance.
  const detailsId = useId();
  useEffect(() => {
    setDismissed(false);
    setOpen(false);
  }, [failure.details, failure.sentence]);
  if (dismissed) return null;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-ink",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 break-words">{failure.sentence}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss error"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-destructive-ink hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onPress}
          className="mt-1 inline-flex min-h-9 items-center text-xs font-medium underline underline-offset-2"
        >
          {action.label}
        </button>
      ) : null}
      {failure.details ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={detailsId}
            className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs underline underline-offset-2 sm:min-h-0"
          >
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")}
              aria-hidden
            />
            {open ? "Hide details" : "Show details"}
          </button>
          {open ? (
            <p
              id={detailsId}
              className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded bg-background/60 p-2 font-mono text-[11px] text-destructive-ink"
            >
              {failure.details}
            </p>
          ) : null}
        </>
      ) : null}
      <ErrorAlchemyMenu className="ml-auto" />
    </div>
  );
}

export default ConsentFailureNotice;
