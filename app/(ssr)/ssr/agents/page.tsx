import { AgentsGrid } from "@/features/agents/components/agent-listings/AgentsGrid";

export const metadata = {
  title: "Agents",
  description: "Browse, search, and manage your AI agents.",
};

export default function AgentsPage() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <AgentsGrid />
      </div>
    </div>
  );
}
