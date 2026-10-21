import { getAgent } from "@/lib/agents/data";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { agentVersionTabTitle } from "@/features/agents/route/agent-version-tab-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  // A null read is ambiguous (denied / deleted / never existed) — the body
  // renders the real answer via <AccessGate>; the tab title stays generic.
  return createDynamicRouteMetadata("/agents", {
    title: agentVersionTabTitle(agent?.name, agent?.version ?? null),
    ...(agent ? { description: `Version history for ${agent.name}.` } : {}),
    letter: "LA",
  });
}

export default function AgentVersionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
