import { AgentRunPage } from "@/features/agents/components/run/AgentRunPage";

export const metadata = { title: "Run" };

export default async function AgentRunRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentRunPage agentId={id} />;
}
