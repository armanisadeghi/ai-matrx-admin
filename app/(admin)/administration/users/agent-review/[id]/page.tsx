// record-view: none — an admin support view; the admin seat never edits an organization's fields
import AgentReviewWorkspace from "@/features/admin/agent-review/components/AgentReviewWorkspace";

export const dynamic = "force-dynamic";

export default async function AgentReviewItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentReviewWorkspace reviewId={id} />;
}
