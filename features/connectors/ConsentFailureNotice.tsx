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

import { useId, useState } from "react";
import { AlertTriangle, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const failureKey = `${failure.sentence}\u0000${failure.details ?? ""}`;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const open = openKey === failureKey;
  // Both consent surfaces can be on screen at once (Settings mounts the panel's
  // own notice AND the dialog body), so the disclosure's id is per instance.
  const detailsId = useId();
  if (dismissedKey === failureKey) return null;
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
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                icon={<X aria-hidden />}
                type="button"
                variant="quiet"
                onClick={() => setDismissedKey(failureKey)}
                aria-label="Dismiss error"
                className="-mr-2 -mt-2 shrink-0"
              />
            </TooltipTrigger>
            <TooltipContent>Dismiss error</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {action ? (
        <Button
          type="button"
          variant="link"
          onClick={action.onPress}
          className="mt-1"
        >
          {action.label}
        </Button>
      ) : null}
      {failure.details ? (
        <>
          <Button
            icon={<ChevronDown
              className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")}
              aria-hidden
            />}
            type="button"
            variant="link"
            onClick={() => setOpenKey(open ? null : failureKey)}
            aria-expanded={open}
            aria-controls={detailsId}
            className="mt-1"
          >
            {open ? "Hide details" : "Show details"}
          </Button>
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
