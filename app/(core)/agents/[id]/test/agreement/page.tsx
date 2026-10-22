// record-view: none — a sub-view (judge agreement) inside a record's test section, not the record page
import { Suspense } from "react";
import { getAgent } from "@/lib/agents/data";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { JudgeAgreementPage } from "@/features/agent-tests/components/JudgeAgreementPage";

// How often people agree with the test judge on this agent's results (Agent Evaluation PLAN §3).
export default async function AgentJudgeAgreementRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    return <AccessGate token="agent" id={id} fallbackHref="/agents" fallbackLabel="All agents" />;
  }
  return (
    <Suspense>
      <JudgeAgreementPage agentId={id} agentName={agent.name} seat="user" basePath="/agents" backHref="/agents/all" />
    </Suspense>
  );
}
