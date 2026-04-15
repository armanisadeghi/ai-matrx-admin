import { getAgent } from "@/lib/agents/data";
import { AgentVersionsWorkspace } from "@/features/agents/route/AgentVersionsWorkspace";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AgentHeader } from "@/features/agents/components/shared/AgentHeader";

export const metadata = { title: "Agent Versions | AI Matrx" };

export default async function AgentLatestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);

  return (
    <>
      <PageHeader>
        <AgentHeader agentId={id} agentName={agent.name} />
      </PageHeader>
      <AgentVersionsWorkspace agentId={id} />
    </>
  );
}
