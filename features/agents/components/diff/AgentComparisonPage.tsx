"use client";

import { useEffect, useState, useTransition } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchAgentsListFull,
  fetchFullAgent,
  fetchAgentVersionHistory,
  fetchAgentVersionSnapshot,
} from "@/features/agents/redux/agent-definition/thunks";
import type { AgentVersionHistoryItem } from "@/features/agents/redux/agent-definition/thunks";
import {
  selectAllAgentsArray,
  selectAgentById,
  selectVersionsByParentAgentId,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { AgentDiffViewer } from "./AgentDiffViewer";

interface SideState {
  agentId: string | null;
  version: "current" | number | null;
  versionsLoading: boolean;
  versionHistory: AgentVersionHistoryItem[];
  snapshotLoading: boolean;
}

const initialSide: SideState = {
  agentId: null,
  version: null,
  versionsLoading: false,
  versionHistory: [],
  snapshotLoading: false,
};

export function AgentComparisonPage() {
  const dispatch = useAppDispatch();
  const [, startTransition] = useTransition();

  const allAgents = useAppSelector(selectAllAgentsArray);
  const [agentsLoading, setAgentsLoading] = useState(allAgents.length === 0);

  const [left, setLeft] = useState<SideState>(initialSide);
  const [right, setRight] = useState<SideState>(initialSide);

  // Load agents list on mount
  useEffect(() => {
    if (allAgents.length === 0) {
      dispatch(fetchAgentsListFull())
        .unwrap()
        .finally(() => setAgentsLoading(false));
    } else {
      setAgentsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sorted agent list for the dropdowns
  const agentOptions = allAgents
    .filter((a) => !a.isVersion)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const handleAgentChange = (side: "left" | "right", agentId: string) => {
    const setter = side === "left" ? setLeft : setRight;
    setter((prev) => ({
      ...prev,
      agentId,
      version: "current",
      versionsLoading: true,
      versionHistory: [],
    }));

    // Fetch full agent + version history
    dispatch(fetchFullAgent(agentId));
    dispatch(fetchAgentVersionHistory({ agentId, limit: 100 }))
      .unwrap()
      .then((data) => {
        setter((prev) => ({
          ...prev,
          versionHistory: data,
          versionsLoading: false,
        }));
      })
      .catch(() => {
        setter((prev) => ({ ...prev, versionsLoading: false }));
      });
  };

  const handleVersionChange = (side: "left" | "right", version: string) => {
    const setter = side === "left" ? setLeft : setRight;
    const state = side === "left" ? left : right;

    if (version === "current") {
      setter((prev) => ({ ...prev, version: "current" }));
      return;
    }

    const versionNum = parseInt(version, 10);
    setter((prev) => ({ ...prev, version: versionNum, snapshotLoading: true }));

    if (state.agentId) {
      dispatch(fetchAgentVersionSnapshot({ agentId: state.agentId, version: versionNum }))
        .unwrap()
        .finally(() => {
          setter((prev) => ({ ...prev, snapshotLoading: false }));
        });
    }
  };

  // Resolve the actual agent records for each side
  const leftAgent = useAppSelector((s) => (left.agentId ? selectAgentById(s, left.agentId) : undefined));
  const rightAgent = useAppSelector((s) => (right.agentId ? selectAgentById(s, right.agentId) : undefined));
  const leftVersions = useAppSelector((s) => (left.agentId ? selectVersionsByParentAgentId(s, left.agentId) : []));
  const rightVersions = useAppSelector((s) => (right.agentId ? selectVersionsByParentAgentId(s, right.agentId) : []));

  const resolvedLeft = left.version === "current"
    ? leftAgent
    : leftVersions.find((v) => v.version === left.version);
  const resolvedRight = right.version === "current"
    ? rightAgent
    : rightVersions.find((v) => v.version === right.version);

  const leftLabel = left.agentId && resolvedLeft
    ? left.version === "current"
      ? `${leftAgent?.name ?? "Agent"} — Current${leftAgent?.version != null ? ` (v${leftAgent.version})` : ""}`
      : `${leftAgent?.name ?? "Agent"} — Version ${left.version}`
    : "Select left side";

  const rightLabel = right.agentId && resolvedRight
    ? right.version === "current"
      ? `${rightAgent?.name ?? "Agent"} — Current${rightAgent?.version != null ? ` (v${rightAgent.version})` : ""}`
      : `${rightAgent?.name ?? "Agent"} — Version ${right.version}`
    : "Select right side";

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Loading agents...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ paddingTop: "var(--shell-header-h)" }}>
      {/* Selector toolbar */}
      <div className="shrink-0 border-b border-border bg-card/50">
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* Left side selector */}
          <SideSelector
            label="Left"
            agents={agentOptions}
            selectedAgentId={left.agentId}
            selectedVersion={left.version}
            versionHistory={left.versionHistory}
            versionsLoading={left.versionsLoading}
            onAgentChange={(id) => startTransition(() => handleAgentChange("left", id))}
            onVersionChange={(v) => startTransition(() => handleVersionChange("left", v))}
          />
          {/* Right side selector */}
          <SideSelector
            label="Right"
            agents={agentOptions}
            selectedAgentId={right.agentId}
            selectedVersion={right.version}
            versionHistory={right.versionHistory}
            versionsLoading={right.versionsLoading}
            onAgentChange={(id) => startTransition(() => handleAgentChange("right", id))}
            onVersionChange={(v) => startTransition(() => handleVersionChange("right", v))}
          />
        </div>
      </div>

      {/* Diff content */}
      {left.snapshotLoading || right.snapshotLoading ? (
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : resolvedLeft && resolvedRight ? (
        <div className="flex-1 overflow-hidden">
          <AgentDiffViewer
            oldAgent={resolvedLeft}
            newAgent={resolvedRight}
            oldLabel={leftLabel}
            newLabel={rightLabel}
            className="h-full"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Select an agent and version on each side to compare
        </div>
      )}
    </div>
  );
}

function SideSelector({
  label,
  agents,
  selectedAgentId,
  selectedVersion,
  versionHistory,
  versionsLoading,
  onAgentChange,
  onVersionChange,
}: {
  label: string;
  agents: Array<{ id: string; name: string }>;
  selectedAgentId: string | null;
  selectedVersion: "current" | number | null;
  versionHistory: AgentVersionHistoryItem[];
  versionsLoading: boolean;
  onAgentChange: (id: string) => void;
  onVersionChange: (version: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Select value={selectedAgentId ?? ""} onValueChange={onAgentChange}>
        <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
          <SelectValue placeholder="Select agent..." />
        </SelectTrigger>
        <SelectContent>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedVersion?.toString() ?? ""}
        onValueChange={onVersionChange}
        disabled={!selectedAgentId || versionsLoading}
      >
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder={versionsLoading ? "Loading..." : "Version..."} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Current</SelectItem>
          {versionHistory.map((v) => (
            <SelectItem key={v.version_number} value={v.version_number.toString()}>
              <span className="font-mono tabular-nums">v{v.version_number}</span>
              {v.change_note && (
                <span className="ml-1.5 text-muted-foreground truncate">— {v.change_note}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
