// record-view: none — a sub-view (review) inside a record or scope, not the record page; the record's own page carries the section
// /workflows/[id]/review — one workflow's review issues (flagged runs grouped
// into issues: occurrences, runs, first/last seen, status actions).

import { WorkflowReviewPage } from "@/features/workflow-runtime/review/components/WorkflowReviewPage";

export async function generateMetadata() {
  return { title: "Review" };
}

export default async function WorkflowReviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowReviewPage definitionId={id} />;
}
