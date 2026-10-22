// record-view: none — a sub-view (judge agreement) inside a record's test section, not the record page
import { Suspense } from "react";
import { getAgent } from "@/lib/agents/data";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { JudgeAgreementPage } from "@/features/agent-tests/components/JudgeAgreementPage";

export const metadata = { title: "System Agent Judge Agreement | Admin" };

const ADMIN_BASE_PATH = "/administration/agents/system-agents/agents";

// The admin mirror of the agent's judge agreement (Agent Evaluation PLAN §3).
export default async function AdminSystemAgentJudgeAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    return <AccessGate token="agent" id={id} fallbackHref="/administration/agents/system-agents" fallbackLabel="System agents" />;
  }
  return (
    <Suspense>
      <JudgeAgreementPage agentId={id} agentName={agent.name} seat="admin" basePath={ADMIN_BASE_PATH} backHref={ADMIN_BASE_PATH} />
    </Suspense>
  );
}
