import { notFound } from "next/navigation";
import { getAgent, getAgentSnapshot } from "@/lib/agents/data";
import { VersionHydrator } from "@/features/agents/route/VersionHydrator";
import { AgentComparisonView } from "@/features/agents/route/AgentComparisonView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) return { title: "Not Found" };

  const agent = await getAgent(id);
  return { title: `v${versionNum} — ${agent.name}` };
}

export default async function AgentVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) notFound();

  const [agent, snapshot] = await Promise.all([
    getAgent(id),
    getAgentSnapshot(id, versionNum),
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <VersionHydrator snapshot={snapshot} />
      <AgentComparisonView liveAgent={agent} snapshot={snapshot} />
    </div>
  );
}
