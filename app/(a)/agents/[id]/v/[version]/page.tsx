import { notFound } from "next/navigation";
import { AgentVersionsWorkspace } from "@/features/agents/route/AgentVersionsWorkspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { version } = await params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) return { title: "Not Found" };
  return { title: `v${versionNum}` };
}

export default async function AgentVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = await params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) notFound();

  return <AgentVersionsWorkspace agentId={id} initialVersion={versionNum} />;
}
