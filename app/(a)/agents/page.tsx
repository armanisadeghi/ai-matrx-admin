import { getAgentListSeed } from "@/lib/agents/data";
import { AgentListHydrator } from "@/features/agents/route/AgentListHydrator";
import { AgentsGrid } from "@/features/agents/components/agent-listings/AgentsGrid";

export default async function AgentsListPage() {
  const seeds = await getAgentListSeed();

  return (
    <>
      <AgentListHydrator seeds={seeds} />
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 max-w-[1800px]">
          <AgentsGrid />
        </div>
      </div>
    </>
  );
}
