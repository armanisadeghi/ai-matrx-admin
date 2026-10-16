import { Suspense } from "react";
import { getAgent } from "@/lib/agents/data";
import { AccessGate } from "@/features/access-gate/components/AccessGate";
import { AgentTestPage } from "@/features/agent-tests/components/AgentTestPage";

export const metadata = { title: "System Agent Tests | Admin" };

const ADMIN_BASE_PATH = "/administration/agents/system-agents/agents";

// The system agent's test cases and platform test runs — read-only in Phase 1
// (Agent Evaluation PLAN §8). Platform runs are filed in the admin's own admin
// organization with purpose 'platform', never the Matrx System tenant.
export default async function AdminSystemAgentTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    return (
      <AccessGate
        token="agent"
        id={id}
        fallbackHref="/administration/agents/system-agents"
        fallbackLabel="System agents"
      />
    );
  }
  return (
    <Suspense>
      <AgentTestPage
        agentId={id}
        agentName={agent.name}
        seat="admin"
        basePath={ADMIN_BASE_PATH}
        backHref={ADMIN_BASE_PATH}
      />
    </Suspense>
  );
}
