// /workflows/review — the cross-workflow review inbox: every issue the person
// can see, in every organization (on-page organization filter, default All).
// useSearchParams (?org_filter=) needs a Suspense boundary.

import { Suspense } from "react";

import { ReviewInboxPage } from "@/features/workflow-runtime/review/components/ReviewInboxPage";

export async function generateMetadata() {
  return { title: "Review" };
}

export default function ReviewInboxRoute() {
  return (
    <Suspense fallback={<div className="h-full overflow-hidden" />}>
      <ReviewInboxPage />
    </Suspense>
  );
}
