import { AgentViewContent } from "@/features/agents/route/AgentViewContent";

export const metadata = { title: "View" };

export default async function AgentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentViewContent agentId={id} />;
}
