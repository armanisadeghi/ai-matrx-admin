import { AgentBuilderPage } from "@/features/agents/components/builder/AgentBuilderPage";

export const metadata = { title: "Agent Builder | AI Matrx" };

export default async function AgentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentBuilderPage agentId={id} />;
}
