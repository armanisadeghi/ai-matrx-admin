import { getAgent } from "@/lib/agents/data";
import { AgentBuilder } from "@/features/agents/components/builder/AgentBuilder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: `Edit ${agent.name}` };
}

export default async function AgentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentBuilder agentId={id} />;
}
