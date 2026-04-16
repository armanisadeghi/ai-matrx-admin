"use client";

import type { UseAgentConsumerReturn } from "@/features/agents/hooks/useAgentConsumer";
import { SidePanelHeader, SearchInput, CheckRow } from "./primitives";

export interface AgentTagsPanelProps {
  consumer: UseAgentConsumerReturn;
  allTags: string[];
  search: string;
  setSearch: (v: string) => void;
  onClose: () => void;
}

export function AgentTagsPanel({
  consumer,
  allTags,
  search,
  setSearch,
  onClose,
}: AgentTagsPanelProps) {
  const filtered = allTags.filter(
    (t) => !search || t.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <SidePanelHeader title="Tags" onClose={onClose} />
      <div className="px-2 pt-2 pb-1 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter tags..."
        />
      </div>
      {consumer.includedTags.length > 0 && (
        <button
          onClick={() => consumer.includedTags.forEach(consumer.toggleTag)}
          className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left shrink-0"
        >
          Clear ({consumer.includedTags.length})
        </button>
      )}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No tags
          </p>
        ) : (
          filtered.map((tag) => (
            <CheckRow
              key={tag}
              label={tag}
              checked={consumer.includedTags.includes(tag)}
              onClick={() => consumer.toggleTag(tag)}
            />
          ))
        )}
      </div>
    </div>
  );
}
