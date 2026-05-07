"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAuthenticated } from "@/lib/redux/slices/userSlice";
import { ClaimHeader } from "./components/workspace/ClaimHeader";
import { InjuriesList } from "./components/workspace/InjuriesList";
import { ResultPanel } from "./components/workspace/ResultPanel";
import { SaveCaseButton } from "./components/workspace/SaveCaseButton";
import { UtilityTeasers } from "./components/workspace/UtilityTeasers";
import { useRatingDraft } from "./state/useRatingDraft";
import { useLiveRating } from "./state/useLiveRating";
import { useSaveCase } from "./state/useSaveCase";
import { evaluateDraftReadiness } from "./state/buildStatelessPayload";
import type { RatingDraft } from "./state/types";

interface CaPdCalculatorClientProps {
  initialDraft?: RatingDraft;
  mode?: "draft" | "saved";
}

export function CaPdCalculatorClient({
  initialDraft,
  mode = "draft",
}: CaPdCalculatorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthed = useAppSelector(selectIsAuthenticated);

  const {
    draft,
    hydrated,
    updateClaim,
    addInjury,
    updateInjury,
    removeInjury,
    resetDraft,
  } = useRatingDraft({ initialDraft, persist: mode === "draft" });

  const liveRating = useLiveRating(draft);
  const { save, status: saveStatus } = useSaveCase();

  const hasContent =
    draft.claim.applicant_name !== "" ||
    draft.claim.occupational_code !== null ||
    draft.injuries.length > 0;

  // Post-login auto-save trigger.
  // After redirect from /login?redirectTo=...?save=1, kick off the save flow once auth is ready.
  const autoSaveTriggered = React.useRef(false);
  React.useEffect(() => {
    if (autoSaveTriggered.current) return;
    if (!hydrated) return;
    if (mode !== "draft") return;
    if (searchParams.get("save") !== "1") return;
    if (!isAuthed) return;

    const ready = evaluateDraftReadiness(draft);
    if (!ready.ready) return;

    autoSaveTriggered.current = true;
    (async () => {
      const result = await save(draft);
      if (result) {
        toast.success("Case saved", {
          description: "Your case is bookmarked and the rating is persisted.",
        });
        router.replace(`/legal/ca-wc/pd-ratings-calculator/${result.claimId}`);
      }
    })();
  }, [hydrated, isAuthed, mode, searchParams, draft, save, router]);

  const handleSaved = React.useCallback(
    (claimId: string) => {
      router.push(`/legal/ca-wc/pd-ratings-calculator/${claimId}`);
    },
    [router],
  );

  if (!hydrated) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <Hero
        applicantName={draft.claim.applicant_name}
        canReset={hasContent && mode === "draft"}
        onReset={resetDraft}
        rightActions={
          mode === "draft" ? (
            <SaveCaseButton draft={draft} onSaved={handleSaved} />
          ) : (
            <SavedBadge status={saveStatus.kind} />
          )
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-7 space-y-4 lg:space-y-6 min-w-0">
            <ClaimHeader claim={draft.claim} onChange={updateClaim} />
            <InjuriesList
              injuries={draft.injuries}
              onAdd={addInjury}
              onUpdate={updateInjury}
              onRemove={removeInjury}
              liveResult={liveRating.result}
            />
          </div>

          <div className="lg:col-span-5 min-w-0">
            <div className="lg:sticky lg:top-6">
              <ResultPanel liveState={liveRating} />
            </div>
          </div>
        </div>

        <UtilityTeasers />
      </main>
    </div>
  );
}

function Hero({
  applicantName,
  canReset,
  onReset,
  rightActions,
}: {
  applicantName: string;
  canReset: boolean;
  onReset: () => void;
  rightActions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                California Workers&apos; Comp
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                AMA Guides aligned · Estimates only — not legal advice
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {applicantName ? `${applicantName}'s rating` : "PD Ratings Calculator"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">
              Enter the claim details and impairments. Your final rating,
              compensation, and per-side breakdown update live as you type.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canReset && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onReset}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
            {rightActions}
          </div>
        </div>
      </div>
    </header>
  );
}

function SavedBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
      Saved · {status === "saving" ? "syncing…" : "live"}
    </span>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-9 w-72 rounded bg-muted animate-pulse" />
          <div className="mt-3 h-5 w-96 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />
            <div className="h-48 rounded-2xl bg-card border border-border animate-pulse" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
