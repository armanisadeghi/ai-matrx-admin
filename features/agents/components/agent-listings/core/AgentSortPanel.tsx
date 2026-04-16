"use client";

import type { UseAgentConsumerReturn } from "@/features/agents/hooks/useAgentConsumer";
import { SORT_OPTIONS } from "./types";
import { SidePanelHeader, OptionRow } from "./primitives";

export interface AgentSortPanelProps {
  consumer: UseAgentConsumerReturn;
  onClose: () => void;
}

export function AgentSortPanel({ consumer, onClose }: AgentSortPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <SidePanelHeader title="Sort By" onClose={onClose} />
      <div className="overflow-y-auto flex-1">
        {SORT_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            selected={consumer.sortBy === opt.value}
            onClick={() => consumer.setSortBy(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}
