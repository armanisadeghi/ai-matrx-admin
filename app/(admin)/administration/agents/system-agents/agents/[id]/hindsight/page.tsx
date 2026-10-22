// record-view: none — a sub-view (hindsight) inside a record or scope, not the record page; the record's own page carries the section
// Continuous review for one system agent: the same improvement workspace as the core agent page.
import { Suspense } from "react";
import { Skeleton } from "@ai-matrx/design-system";
import { getAgent } from "@/lib/agents/data";
import { AgentHeader } from "@ai-matrx/chat/agents/components/shared/AgentHeader";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { ImprovementWorkspace } from "@/features/hindsight/workspace/ImprovementWorkspace";

export const metadata = { title: "System Agent Review | Admin" };

const ADMIN_BASE_PATH = "/administration/agents/system-agents/agents";

export default async function AdminSystemAgentHindsightPage({
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
      <div className="h-full overflow-hidden">
        <Suspense
          fallback={
            <div className="flex h-full gap-3 p-4 pt-[calc(var(--shell-header-h)+1rem)]">
              <Skeleton className="hidden h-full w-64 2xl:block" />
              <Skeleton className="h-full flex-1" />
            </div>
          }
        >
          <ImprovementWorkspace agentId={id} agentName={agent.name} />
        </Suspense>
      </div>
    </>
  );
}
