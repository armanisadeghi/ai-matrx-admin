import { getAgent } from "@/lib/agents/data";
import { AgentRunnerPage } from "@/features/agents/components/run/AgentRunnerPage";

export const metadata = { title: "Agent Runner | AI Matrx" };

export default async function AgentRunRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);

  return (
    <>
      <AgentRunnerPage agentId={id} />
    </>
  );
}
