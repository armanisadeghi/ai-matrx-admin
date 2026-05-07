"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSaveCase, type SaveStep } from "../../state/useSaveCase";
import { evaluateDraftReadiness } from "../../state/buildStatelessPayload";
import type { RatingDraft } from "../../state/types";

interface SaveCaseButtonProps {
  draft: RatingDraft;
  onSaved?: (claimId: string, reportId: string) => void;
  redirectAfterLogin?: string;
}

const STEP_LABELS: Record<SaveStep, string> = {
  claim: "Saving claim…",
  report: "Creating report…",
  injuries: "Saving injuries…",
  calculate: "Computing rating…",
  bookmark: "Bookmarking…",
};

export function SaveCaseButton({
  draft,
  onSaved,
  redirectAfterLogin,
}: SaveCaseButtonProps) {
  const router = useRouter();
  const { status, save, isAuthed } = useSaveCase();
  const readiness = evaluateDraftReadiness(draft);

  const isSaving = status.kind === "saving";
  const stepLabel = isSaving ? STEP_LABELS[status.step] : null;
  const disabled = !readiness.ready || isSaving;

  const handleClick = async () => {
    if (!isAuthed) {
      const next =
        redirectAfterLogin ?? "/legal/ca-wc/pd-ratings-calculator?save=1";
      router.push(`/login?redirectTo=${encodeURIComponent(next)}`);
      return;
    }

    const result = await save(draft);
    if (result) {
      toast.success("Case saved", {
        description: "Your case is bookmarked and the rating is persisted.",
      });
      onSaved?.(result.claimId, result.reportId);
    } else if (status.kind === "error") {
      toast.error("Couldn't save case", {
        description: status.message,
      });
    }
  };

  React.useEffect(() => {
    if (status.kind === "error") {
      toast.error("Couldn't save case", { description: status.message });
    }
  }, [status]);

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      size="sm"
      className="gap-1.5"
    >
      {isSaving ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {stepLabel}
        </>
      ) : !isAuthed ? (
        <>
          <LogIn className="h-3.5 w-3.5" />
          Sign in to save
        </>
      ) : status.kind === "saved" ? (
        <>
          <BookmarkCheck className="h-3.5 w-3.5" />
          Saved
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5" />
          Save case
        </>
      )}
    </Button>
  );
}
