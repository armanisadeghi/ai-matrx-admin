"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RunItem } from "./RunItem";
import { RunsEmptyState } from "./RunsEmptyState";
import { useAiRunsList } from "../hooks/useAiRunsList";
import type { AiRunsListFilters } from "../types";

interface RunsListProps {
  filters?: AiRunsListFilters;
  activeRunId?: string;
  onRunClick?: (runId: string) => void;
  onRunStar?: (runId: string) => void;
  compact?: boolean;
  emptyMessage?: string;
  emptySubmessage?: string;
}

export function RunsList({
  filters,
  activeRunId,
  onRunClick,
  onRunStar,
  compact = false,
  emptyMessage,
  emptySubmessage,
}: RunsListProps) {
  const { runs, isLoading, hasMore, loadMore } = useAiRunsList(filters || {});

  if (isLoading && runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (runs.length === 0) {
    return <RunsEmptyState message={emptyMessage} submessage={emptySubmessage} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Runs list - scrollable */}
      <div className="flex-1 overflow-y-auto space-y-1 px-2 py-2">
        {runs.map((run) => (
          <RunItem
            key={run.id}
            run={run}
            isActive={run.id === activeRunId}
            onClick={() => onRunClick?.(run.id)}
            onStar={() => onRunStar?.(run.id)}
            compact={compact}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-2 py-2">
          <Button
            onClick={loadMore}
            disabled={isLoading}
            variant="outline"
            className="w-full text-xs h-7"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

