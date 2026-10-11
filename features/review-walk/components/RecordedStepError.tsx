"use client";

// features/review-walk/components/RecordedStepError.tsx
//
// "This step recorded an error" in the walk window. A walk opened from a
// candidate pair speaks the pair window's sentence ("Not run: <reason>" / "The
// run failed.") and keeps the raw server text — which can carry an internal
// account id — behind the platform's error-details affordance (ErrorNotice).

import { ErrorNotice } from "@ai-matrx/design-system";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { isPairWalkLabel, pairFailureSentence } from "@/features/mandates/candidates/words";

export function RecordedStepError({
  error,
  detailLabel = null,
}: {
  error: unknown;
  detailLabel?: string | null;
}) {
  if (isPairWalkLabel(detailLabel)) {
    return (
      <ErrorNotice
        size="compact"
        title="This step failed"
        message={pairFailureSentence(error, null)}
        error={error}
        operation="Look at what the candidate saw"
      />
    );
  }
  return (
    <div className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1 text-[11px] text-red-700 dark:text-red-300">
      This step recorded an error: {typeof error === "string" ? error : JSON.stringify(error)}
      <ErrorAlchemyMenu error={error} />
    </div>
  );
}
