"use client";

/**
 * AgentRunsSidebar
 *
 * Shows the run history for a given agent.
 * Queries Supabase directly — Python manages the agent_runs table.
 * Polls every 10s for new runs (same pattern as PromptRunsSidebar).
 *
 * On run click → changes ?runId= URL param.
 * "New Run" → creates a fresh instance and clears ?runId=.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  History,
  Plus,
  Clock,
  Loader2,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";

interface AgentRun {
  id: string;
  name: string | null;
  created_at: string | null;
  message_count?: number | null;
}

interface AgentRunsSidebarProps {
  agentId: string;
  agentName: string;
  currentRunId?: string;
  onNewRun: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AgentRunsSidebar({
  agentId,
  agentName,
  currentRunId,
  onNewRun,
}: AgentRunsSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    try {
      // Attempt to query agent_runs table (created by Python)
      // Falls back gracefully if table doesn't exist yet.
      const { data, error } = await supabase
        .from("agent_runs" as never)
        .select("id, name, created_at, message_count")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setRuns(data as AgentRun[]);
      }
    } catch {
      // Table may not exist yet — silently handle
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 10_000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const handleRunSelect = (runId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("runId", runId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Run History</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-primary"
            onClick={onNewRun}
          >
            <Plus className="w-3 h-3" />
            New
          </Button>
        </div>
        <p className="text-xs text-muted-foreground truncate">{agentName}</p>
      </div>

      {/* Run list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">No runs yet</p>
          </div>
        ) : (
          runs.map((run) => {
            const isActive = run.id === currentRunId;
            return (
              <button
                key={run.id}
                onClick={() => handleRunSelect(run.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors border-b border-border/50",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate",
                      isActive && "text-primary",
                    )}
                  >
                    {run.name ?? `Run ${run.id.slice(0, 8)}`}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(run.created_at)}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
