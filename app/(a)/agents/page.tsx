import { getAgentListSeed } from "@/lib/agents/data";
import { AgentListHydrator } from "@/features/agents/route/AgentListHydrator";
import { AgentsGrid } from "@/features/agents/components/agent-listings/AgentsGrid";

export default async function AgentsListPage() {
    const seeds = await getAgentListSeed();

    return (
        <>
            <AgentListHydrator seeds={seeds} />
            <div className="h-full overflow-y-auto p-4 md:p-6">
                <AgentsGrid />
            </div>
        </>
    );
}
