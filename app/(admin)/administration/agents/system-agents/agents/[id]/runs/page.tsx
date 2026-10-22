// record-view: none — a sub-view (runs) inside a record or scope, not the record page; the record's own page carries the section
// Every run of this system agent on the one shared runs table (platform view, admin doors).
import { getAgent } from "@/lib/agents/data";
import { AgentHeader } from "@ai-matrx/chat/agents/components/shared/AgentHeader";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { RunsTable } from "@/features/mandates/run-history/RunsTable";

export const metadata = { title: "System Agent Runs | Admin" };

const ADMIN_BASE_PATH = "/administration/agents/system-agents/agents";

export default async function AdminSystemAgentRunsPage({
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
      <div className="h-full overflow-y-auto px-4 pb-4 pt-[calc(var(--shell-header-h)+0.75rem)]">
        <RunsTable
          scope={{ agentId: id }}
          view="platform"
          audience="admin"
          urlId="system-agent-runs"
        />
      </div>
    </>
  );
}
