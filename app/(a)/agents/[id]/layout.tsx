import { getAgent } from "@/lib/agents/data";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { AgentHydratorServer } from "@/features/agents/route/AgentHydratorServer";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AgentHeader } from "@/features/agents/components/shared/AgentHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  return createDynamicRouteMetadata("/agents", {
    title: agent.name,
    description:
      agent.description || `Configure and run the ${agent.name} AI agent`,
  });
}

export default async function AgentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // cache() deduplicates this — generateMetadata already called it above
  const agent = await getAgent(id);

  return (
    <>
      {/* Hydrates Redux store. Runs after paint so layout never blocks on it. */}
      <AgentHydratorServer agentId={id} />
      <PageHeader>
        {/* Server shell with SSR-known agent name — no flash, no empty state */}
        <AgentHeader agentId={id} agentName={agent.name} />
      </PageHeader>
      <div className="h-full overflow-hidden">{children}</div>
    </>
  );
}
