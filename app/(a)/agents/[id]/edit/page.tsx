import { AgentBuilder } from "@/features/agents/components/builder/AgentBuilder";

export const metadata = { title: "Build" };

export default async function AgentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentBuilder agentId={id} />;
}
