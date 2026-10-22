// record-view: none — a spend approval (billing.run_approval) takes no custom fields
// SubjectApprovalsPanel — one system agent's spend approval: status, decision history,
// held runs, spend (Arman 2026-10-16: "Just like the admin agent routes have build, run, etc.,
// they should have 'approvals' as well").
import { getAgent } from "@/lib/agents/data";
import { AgentHeader } from "@ai-matrx/chat/agents/components/shared/AgentHeader";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { SubjectApprovalsPanel } from "@/features/admin/spend-approvals/SubjectApprovalsPanel";

export const metadata = { title: "System Agent Approvals | Admin" };

const ADMIN_BASE_PATH = "/administration/agents/system-agents/agents";

export default async function AdminSystemAgentApprovalsPage({
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
    <>
      <PageHeader>
        <AgentHeader
          agentId={id}
          agentName={agent.name}
          backHref={ADMIN_BASE_PATH}
          basePath={ADMIN_BASE_PATH}
        />
      </PageHeader>
      <div className="p-3">
        <SubjectApprovalsPanel subject={{ kind: "agent", id }} seat="admin" />
      </div>
    </>
  );
}
