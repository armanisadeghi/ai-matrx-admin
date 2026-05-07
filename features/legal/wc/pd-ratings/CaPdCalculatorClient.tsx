"use client";

import * as React from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClaimHeader } from "./components/workspace/ClaimHeader";
import { InjuriesList } from "./components/workspace/InjuriesList";
import { ResultPanel } from "./components/workspace/ResultPanel";
import { useRatingDraft } from "./state/useRatingDraft";
import { useLiveRating } from "./state/useLiveRating";
import type { RatingDraft } from "./state/types";

interface CaPdCalculatorClientProps {
  initialDraft?: RatingDraft;
}

export function CaPdCalculatorClient({ initialDraft }: CaPdCalculatorClientProps) {
  const {
    draft,
    hydrated,
    updateClaim,
    addInjury,
    updateInjury,
    removeInjury,
    resetDraft,
  } = useRatingDraft({ initialDraft });

  const liveRating = useLiveRating(draft);

  const hasContent =
    draft.claim.applicant_name !== "" ||
    draft.claim.occupational_code !== null ||
    draft.injuries.length > 0;

  if (!hydrated) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <Hero
        applicantName={draft.claim.applicant_name}
        canReset={hasContent}
        onReset={resetDraft}
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
      </main>
    </div>
  );
}

function Hero({
  applicantName,
  canReset,
  onReset,
}: {
  applicantName: string;
  canReset: boolean;
  onReset: () => void;
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

          {canReset && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </header>
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
