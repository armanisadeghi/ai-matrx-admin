"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchAgentVersionHistory } from "@/features/agents/redux/agent-definition/thunks";
import type { AgentVersionHistoryItem } from "@/features/agents/redux/agent-definition/thunks";
import { Loader2, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentVersionHistoryPanel({ agentId }: { agentId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [versions, setVersions] = useState<AgentVersionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dispatch(fetchAgentVersionHistory({ agentId, limit: 50 }))
      .unwrap()
      .then((data) => {
        if (!cancelled) setVersions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load versions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, dispatch]);

  const handleVersionClick = (versionNumber: number) => {
    startTransition(() => {
      router.push(`/agents/${agentId}/${versionNumber}`);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Loading version history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm">
        {error}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No version history found.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-border">
        {versions.map((v) => (
          <button
            key={v.version_number}
            onClick={() => handleVersionClick(v.version_number)}
            disabled={isPending}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
              isPending && "opacity-60",
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-xs font-semibold tabular-nums shrink-0">
              v{v.version_number}
            </div>
            <div className="flex-1 min-w-0">
              {v.change_note && (
                <p className="text-sm truncate">{v.change_note}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(v.changed_at).toLocaleString()}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
