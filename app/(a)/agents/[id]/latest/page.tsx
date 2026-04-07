import { getAgent } from "@/lib/agents/data";
import { AgentVersionsWorkspace } from "@/features/agents/route/AgentVersionsWorkspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: `Versions — ${agent.name}` };
}

export default async function AgentLatestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentVersionsWorkspace agentId={id} />;
}
