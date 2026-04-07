import { getAgent } from "@/lib/agents/data";
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
  return {
    title: {
      template: "%s | AI Matrx",
      default: `${agent.name} | AI Matrx`,
    },
    description: agent.description,
  };
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
