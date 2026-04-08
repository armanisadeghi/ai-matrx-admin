import { AgentVersionsWorkspace } from "@/features/agents/route/AgentVersionsWorkspace";

export const metadata = { title: "Versions" };

export default async function AgentLatestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentVersionsWorkspace agentId={id} />;
}
