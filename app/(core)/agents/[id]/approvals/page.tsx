// record-view: none — a spend approval (billing.run_approval) takes no custom fields
// SubjectApprovalsPanel — this agent's spend approval on its organization's seat:
// status, decision history, held runs, spend (Arman 2026-10-16).
import { getAgent } from "@/lib/agents/data";
import { AgentHeader } from "@ai-matrx/chat/agents/components/shared/AgentHeader";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { OrgSubjectApprovals } from "@/features/admin/spend-approvals/OrgSubjectApprovals";

export const metadata = { title: "Agent Approvals" };

export default async function AgentApprovalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    return <AccessGate token="agent" id={id} fallbackHref="/agents" fallbackLabel="All agents" />;
  }
  return (
    <>
      <PageHeader>
        <AgentHeader agentId={id} agentName={agent.name} />
      </PageHeader>
      <div className="h-full overflow-y-auto p-3">
        <OrgSubjectApprovals orgIdParam={agent.organizationId ?? null} subject={{ kind: "agent", id }} />
      </div>
    </>
  );
}
