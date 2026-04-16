"use client";

import type { UseAgentConsumerReturn } from "@/features/agents/hooks/useAgentConsumer";
import { SidePanelHeader, SearchInput, CheckRow } from "./primitives";

export interface AgentCategoriesPanelProps {
  consumer: UseAgentConsumerReturn;
  allCategories: string[];
  search: string;
  setSearch: (v: string) => void;
  onClose: () => void;
}

export function AgentCategoriesPanel({
  consumer,
  allCategories,
  search,
  setSearch,
  onClose,
}: AgentCategoriesPanelProps) {
  const filtered = allCategories.filter(
    (c) => !search || c.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <SidePanelHeader title="Categories" onClose={onClose} />
      <div className="px-2 pt-2 pb-1 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter categories..."
        />
      </div>
      {consumer.includedCats.length > 0 && (
        <button
          onClick={() => consumer.includedCats.forEach(consumer.toggleCategory)}
          className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left shrink-0"
        >
          Clear ({consumer.includedCats.length})
        </button>
      )}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No categories
          </p>
        ) : (
          filtered.map((cat) => (
            <CheckRow
              key={cat}
              label={cat}
              checked={consumer.includedCats.includes(cat)}
              onClick={() => consumer.toggleCategory(cat)}
            />
          ))
        )}
      </div>
    </div>
  );
}
