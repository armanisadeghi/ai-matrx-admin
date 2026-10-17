// /workflows/[id]/review/[issueId] — ONE review issue and its occurrences.
// Review-issue notifications link here.

import { ReviewIssuePage } from "@/features/workflow-runtime/review/components/ReviewIssuePage";

export async function generateMetadata() {
  return { title: "Issue" };
}

export default async function ReviewIssueRoute({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  return <ReviewIssuePage definitionId={id} issueId={issueId} />;
}
