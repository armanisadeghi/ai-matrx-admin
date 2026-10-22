// record-view: none — a sub-view (test) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { getAgent } from "@/lib/agents/data";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { AgentTestPage } from "@/features/agent-tests/components/AgentTestPage";

// The agent's test cases, test runs and their results (Agent Evaluation P1).
// A user page: the viewer's own runs, under their own row security.
export default async function AgentTestRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) {
    return <AccessGate token="agent" id={id} fallbackHref="/agents" fallbackLabel="All agents" />;
  }
  return (
    <Suspense>
      <AgentTestPage
        agentId={id}
        agentName={agent.name}
        seat="user"
        basePath="/agents"
        backHref="/agents/all"
      />
    </Suspense>
  );
}
