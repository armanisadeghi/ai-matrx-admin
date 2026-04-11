import { AgentRunnerPage } from "@/features/agents/components/run/AgentRunnerPage";

export const metadata = { title: "Agent Runner | AI Matrx" };

export default async function AgentRunRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentRunnerPage agentId={id} />;
}
