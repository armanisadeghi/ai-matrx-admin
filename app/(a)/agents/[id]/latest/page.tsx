import { AgentVersionsWorkspace } from "@/features/agents/route/AgentVersionsWorkspace";

export const metadata = { title: "Agent Versions | AI Matrx" };

export default async function AgentLatestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentVersionsWorkspace agentId={id} />;
}
