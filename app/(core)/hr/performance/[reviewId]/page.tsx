// record-view: none — its record type is not registered for custom fields
// `/hr/performance/[reviewId]` — one 360 review: both halves side by side once both are in.

import { hrHref, hrPerformance360Href } from "@/features/hr/routes";
import { Suspense } from "react";

import { Review360RecordHeader, Review360ReviewPage } from "@/features/employee-performance-reviews/review-360/Review360Pages";

export const metadata = { title: "360 review" };

export default async function HrPerformanceReviewPage({ params, searchParams }: { params: Promise<{ reviewId: string }>; searchParams: Promise<{ org?: string }> }) {
  const org = (await searchParams).org;
  const { reviewId } = await params;
  return (
    <>
      <Review360RecordHeader
        backHref={hrPerformance360Href(org)}
        parents={[{ label: "HR", href: hrHref(org) }, { label: "360 review (trial)", href: hrPerformance360Href(org) }]}
        reviewId={reviewId}
        name="360 review"
      />
      <Suspense fallback={<div className="h-full animate-pulse bg-card/40" aria-label="Loading the review" />}>
        <Review360ReviewPage reviewId={reviewId} />
      </Suspense>
    </>
  );
}
