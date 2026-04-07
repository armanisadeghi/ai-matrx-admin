import { getAgent } from "@/lib/agents/data";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { AgentHydrator } from "@/features/agents/route/AgentHydrator";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AgentSharedHeader } from "@/features/agents/components/shared/AgentSharedHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  return createDynamicRouteMetadata("/agents", {
    title: agent.name,
    description: agent.description || `Configure and run the ${agent.name} AI agent`,
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
  const agent = await getAgent(id);

  return (
    <>
      <AgentHydrator definition={agent} />
      <PageHeader>
        <AgentSharedHeader agentId={id} />
      </PageHeader>
      <div className="h-full overflow-hidden">{children}</div>
    </>
  );
}
