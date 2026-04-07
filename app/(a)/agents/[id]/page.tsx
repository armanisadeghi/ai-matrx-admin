import { getAgent } from "@/lib/agents/data";
import { AgentViewContent } from "@/features/agents/route/AgentViewContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: agent.name };
}

export default async function AgentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentViewContent agentId={id} />;
}
