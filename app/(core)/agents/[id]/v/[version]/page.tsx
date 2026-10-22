// record-view: none — addressed by a catalog key (version), not a record id
import { notFound } from "next/navigation";
import { getAgent } from "@/lib/agents/data";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { agentVersionTabTitle } from "@/features/agents/route/agent-version-tab-title";
import { AgentVersionDiffPage } from "@/features/agents/components/diff/AgentVersionDiffPage";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AgentHeader } from "@ai-matrx/chat/agents/components/shared/AgentHeader";
import { AccessGate } from "@ai-matrx/sharing/access/react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) return { title: "Agent version" };
  const agent = await getAgent(id);
  return createDynamicRouteMetadata("/agents", {
    title: agentVersionTabTitle(agent?.name, versionNum),
    letter: "LA",
  });
}

export default async function AgentVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) notFound();

  const agent = await getAgent(id);

  // A null read is ambiguous under RLS (denied / deleted / never existed /
  // session expired) — the gate asks the platform which one it actually is
  // instead of a generic 404.
  if (!agent) {
    return (
      <AccessGate
        token="agent"
        id={id}
        fallbackHref="/agents"
        fallbackLabel="All agents"
      />
    );
  }

  return (
    <>
      <PageHeader>
        <AgentHeader agentId={id} agentName={agent.name} />
      </PageHeader>
      <AgentVersionDiffPage agentId={id} initialVersion={versionNum} />
    </>
  );
}
