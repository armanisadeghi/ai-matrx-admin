import { getAgent } from "@/lib/agents/data";
import { AgentVersionHistoryPanel } from "@/features/agents/route/AgentVersionHistoryPanel";

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AgentVersionHistoryPanel agentId={id} />
    </div>
  );
}
