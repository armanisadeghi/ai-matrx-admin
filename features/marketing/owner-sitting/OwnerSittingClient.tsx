"use client";

// features/marketing/owner-sitting/OwnerSittingClient.tsx
//
// The owner's sitting on a brand: opens (or resumes) this person's sitting and
// hands it to the Question Desk's shared answer bar in its `story` seat — one
// question per screen, spoken or typed, saved verbatim to the interview row.
// When the last answer is in, the sitting closes and the owner-room run starts
// in its floating window (never a spinner on this page).

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";

import { InterviewClient } from "@/features/question-desk/components/InterviewClient";
import { useOpenWorkflowRunWindow } from "@/features/overlays/definitions/workflowRunWindow.overlay";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";

import { finishOwnerSitting, openOwnerSitting, type OpenedSitting } from "./service";

export interface OwnerSittingClientProps {
  brandId: string;
  brandName: string;
  organizationId: string;
  /** Where "back" goes: the brand's Identity page. */
  backHref: string;
}

export function OwnerSittingClient({ brandId, brandName, organizationId, backHref }: OwnerSittingClientProps) {
  const userId = useAppSelector(selectUserId);
  const dispatch = useAppDispatch();
  const openRunWindow = useOpenWorkflowRunWindow();
  const [sitting, setSitting] = useState<OpenedSitting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    setError(null);
    openOwnerSitting({ brandId, brandName, organizationId, userId })
      .then((opened) => {
        if (live) setSitting(opened);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [brandId, brandName, organizationId, userId, attempt]);

  const onAllAnswered = (interviewId: string) => async () => {
    try {
      // The brand's own organization: the run and the testimony it saves belong there.
      await ensureOrgId(organizationId);
      const { runId } = await finishOwnerSitting(dispatch, { brandId, organizationId, interviewId });
      openRunWindow({ runId, workflowName: "Reading your answers" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reading your answers could not start.");
    }
  };

  if (error) {
    return (
      <EmptyState
        icon={<Mic className="size-5" aria-hidden />}
        title="Your story could not open"
        line={error}
        action={<Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}
      />
    );
  }
  if (!sitting) return <RegionSkeleton shape="rows" count={4} aria-label="Opening your story" />;
  if (sitting.status === "all_asked") {
    return (
      <EmptyState
        icon={<Mic className="size-5" aria-hidden />}
        title="Every story question is answered"
        line="New questions appear here when they are added."
      />
    );
  }
  return (
    <InterviewClient
      key={sitting.interviewId}
      interviewId={sitting.interviewId}
      seat={{
        backHref,
        backLabel: "Identity",
        answering: "story",
        onAllAnswered: onAllAnswered(sitting.interviewId),
      }}
    />
  );
}
