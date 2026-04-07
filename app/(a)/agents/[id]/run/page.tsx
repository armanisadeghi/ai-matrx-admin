import { getAgent } from "@/lib/agents/data";
import { AgentRunPage } from "@/features/agents/components/run/AgentRunPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: `Run ${agent.name}` };
}

export default async function AgentRunRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentRunPage agentId={id} />;
}
