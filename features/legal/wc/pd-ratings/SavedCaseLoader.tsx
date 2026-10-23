"use client";

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  useClaim,
  useReportForClaim,
  useReportInjuries,
} from "./api/hooks";
import { hydrateRatingDraft } from "./state/hydrateFromServer";
import { CaPdCalculatorClient } from "./CaPdCalculatorClient";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { fetchMyClaims } from "./api/claims";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
/** The case crumb's door: every other saved case, through the saved-cases list's own read, capped. */
async function caseSiblings(claimId: string): Promise<CrumbOption[]> {
  const rows = await fetchMyClaims();
  return rows.slice(0, SIBLINGS_MAX).map((row) => ({
    label: row.applicant_name || row.case_number || "Untitled case",
    href: `/legal/ca-wc/pd-ratings-calculator/${row.id}`,
    active: row.id === claimId,
  }));
}

function LoaderHeader({ claimId }: { claimId: string }) {
  return (
    <RecordPageHeader
      backHref="/legal/ca-wc"
      parents={[
        { label: "Legal", href: "/legal" },
        { label: "CA WC", href: "/legal/ca-wc" },
      ]}
      record={{ name: "PD Rating", loadSiblings: () => caseSiblings(claimId) }}
    />
  );
}

interface SavedCaseLoaderProps {
  claimId: string;
}

export function SavedCaseLoader({ claimId }: SavedCaseLoaderProps) {
  const claim = useClaim(claimId);
  const report = useReportForClaim(claimId);
  const reportId = report.data?.id;
  const injuries = useReportInjuries(reportId);

  const isLoading =
    claim.isLoading ||
    report.isLoading ||
    (!!reportId && injuries.isLoading);

  const error = report.error ?? injuries.error;

  if (isLoading) {
    return (
      <>
        <LoaderHeader claimId={claimId} />
        <div className="flex items-center justify-center min-h-[60dvh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading saved case…</span>
          </div>
        </div>
      </>
    );
  }

  if (claim.error || !claim.data) {
    return (
      <>
        <LoaderHeader claimId={claimId} />
        <AccessGate
          token="wc_claim"
          id={claimId}
          error={claim.error}
          onRetry={() => void claim.refetch()}
          fallbackHref="/legal/ca-wc/cases"
          fallbackLabel="Saved cases"
        />
      </>
    );
  }

  if (error) {
    return <ErrorState claimId={claimId} message={(error as Error).message ?? "Couldn't load case"} />;
  }

  if (!report.data) {
    return (
      <ErrorState
        claimId={claimId}
        message="This claim doesn't have a rating report yet."
        detail="Open the calculator and add injuries to create one."
      />
    );
  }

  const initialDraft = hydrateRatingDraft(
    claim.data,
    report.data,
    injuries.data ?? { injuries: [], count: 0 },
  );

  return <CaPdCalculatorClient initialDraft={initialDraft} mode="saved" />;
}

function ErrorState({
  claimId,
  message,
  detail,
}: {
  claimId: string;
  message: string;
  detail?: string;
}) {
  return (
    <>
      <LoaderHeader claimId={claimId} />
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive-ink mb-3">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">{message}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
      </div>
    <ErrorAlchemyMenu /></>
  );
}
