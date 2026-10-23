import { getAgent } from "@/lib/agents/data";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { AgentHydratorServer } from "@ai-matrx/chat/agents/route/AgentHydratorServer";
import { DeclareAgentRecord } from "@/features/agents/route/DeclareAgentRecord";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  // A null read is ambiguous (denied / deleted / never existed) — the page
  // body renders the real answer via <AccessGate>; the tab title stays generic.
  if (!agent) {
    return createDynamicRouteMetadata("/agents", {
      title: "Agent",
    });
  }
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

  return (
    <>
      {/* Hydrates Redux store. Runs after paint so layout never blocks on it. */}
      <AgentHydratorServer agentId={id} />
      {/* The record every page under /agents/[id] shows, with its name ("Add to my menu" adds this agent). */}
      <DeclareAgentRecord id={id} />
      {/* The trail (Agents › <agent ▾> › <page>) is the /agents layout's fallback: the agent crumb
          opens the other agents (the `agent` sibling loader, read from the record declared here). */}
      <div className="h-full overflow-y-auto overflow-x-hidden">{children}</div>
    </>
  );
}
