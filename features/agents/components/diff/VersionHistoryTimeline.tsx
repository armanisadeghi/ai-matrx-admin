"use client";

import { useState } from "react";
import { Badge, Button, Chip, ChipSet } from "@ai-matrx/design-system/controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import {
  MatrxVersionTimeline,
  type VersionTimelineEntry,
} from "@ai-matrx/design-system/data-table";
import { toast } from "@ai-matrx/chat/host/notify";
import { supabase } from "@ai-matrx/chat/host/db";
import { useAgentDuplicateFlow } from "@/features/agents/hooks/useAgentDuplicateFlow";
import { Copy, Atom, ShieldAlert, AlertTriangle } from "lucide-react";
import type { AgentVersionHistoryItem } from "@ai-matrx/chat/agents/types/agent-definition.types";
import { useSmartVersionFetch } from "@/features/agents/hooks/useSmartVersionFetch";
import type { EnrichedVersion } from "@/features/agents/hooks/useSmartVersionFetch";
import { VersionIdBadge } from "@/features/agents/components/diff/VersionIdBadge";
import { ErrorAlchemyMenu } from "@ai-matrx/chat/host/ui-slots";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";

import { Spinner } from "@/components/ui/loaders/Spinner";
interface VersionHistoryTimelineProps {
  agentId: string;
  versions: AgentVersionHistoryItem[];
  currentVersion: number | null;
  onCompare: (version: number, compareToVersion: number | "current") => void;
}

/**
 * The agent's versions on THE shared version timeline (`MatrxVersionTimeline`): compare with the
 * previous / current version, duplicate any version as a new agent, Load for snapshots not read
 * yet, and — per version — the contract-break badge, the declare-a-break menu and the changed
 * fields as chips.
 */
export function VersionHistoryTimeline({
  agentId,
  versions,
  currentVersion,
  onCompare,
}: VersionHistoryTimelineProps) {
  const {
    enrichedVersions,
    loading: enrichLoading,
    progress,
    failedVersions,
    failureReason,
    fetchEnrichedHistory,
    fetchGap,
  } = useSmartVersionFetch(agentId, versions);

  // Any row copies into a NEW agent through the one Duplicate dialog, with
  // that version preselected (the current one copies the agent as it is now).
  const duplicateFlow = useAgentDuplicateFlow();
  const onDuplicate = (versionId: string) =>
    void duplicateFlow.openDuplicate({ agentId, versionId });

  const hasEnrichedData = enrichedVersions.some((v) => v.diffSummary);
  const byNumber = new Map(enrichedVersions.map((v) => [v.version_number, v]));

  const entries = (enriched: boolean): VersionTimelineEntry[] =>
    enrichedVersions.map((version) => {
      const changedFields =
        version.diffSummary?.root.filter((n) => n.changeType !== "unchanged") ?? [];
      return {
        number: version.version_number,
        versionId: version.version_id,
        idCell: <VersionIdBadge versionId={version.version_id} showLabel={false} />,
        at: version.changed_at,
        note: version.change_note ?? null,
        loaded: enriched ? version.snapshotLoaded : false,
        changes: enriched ? (
          <VersionChanges agentId={agentId} version={version} />
        ) : (
          <ContractBreak agentId={agentId} version={version} />
        ),
        changesText: changedFields.map((n) => humanizeIdentifier(n.key) || n.key).join(", ") || null,
      };
    });

  const timeline = (enriched: boolean) => (
    <MatrxVersionTimeline
      tableId={`agent.${agentId}.versions`}
      versions={entries(enriched)}
      currentNumber={currentVersion}
      onCompare={onCompare}
      {...(enriched ? { onLoad: fetchGap } : {})}
      rowActions={(entry) => [
        {
          id: "duplicate",
          icon: Copy,
          label: `Duplicate v${entry.number} as a new agent`,
          disabled: duplicateFlow.isDuplicating,
          onClick: () => {
            const version = byNumber.get(entry.number);
            if (version) onDuplicate(version.version_id);
          },
        },
      ]}
      emptyState={{ title: "No version history" }}
    />
  );

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 type-body text-muted-foreground">
        No version history
      </div>
    );
  }

  // If not enriched yet, show the prompt to load
  if (!hasEnrichedData && !enrichLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-center">
          <div className="type-title mb-1">
            {versions.length} version{versions.length !== 1 ? "s" : ""}{" "}
            available
          </div>
          <p className="type-secondary text-muted-foreground max-w-[320px]">
            Load history to see what changed in each version
          </p>
        </div>

        {/* A load that ran and failed must never fall back to looking like a
            load that was never started. */}
        {failedVersions.length > 0 && (
          <div className="flex items-start gap-2 max-w-[420px] px-3 py-2 rounded-md border border-destructive/30 bg-destructive/10 type-secondary text-destructive-ink">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              {failedVersions.length} of {progress.total} snapshot
              {failedVersions.length !== 1 ? "s" : ""} could not be read
              {failureReason ? `: ${failureReason}` : "."} Retrying loads the
              ones that are readable.
            </span>
            <ErrorAlchemyMenu />
          </div>
        )}
        <Button
          icon={<Atom />}
          variant="primary"
          onClick={fetchEnrichedHistory}
        >
          Load Full History
        </Button>

        {/* Still show the timeline below as a preview */}
        <div className="w-full mt-4 border-t border-border pt-4 px-4">
          {timeline(false)}
        </div>
        {duplicateFlow.dialog}
      </div>
    );
  }

  // Loading state
  if (enrichLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner size="md" className="text-primary" />
        <div className="type-body text-muted-foreground">
          {/* read-gate-exempt: fetch progress shown only while the fetch is in flight, never a result count */}
          Loading version details... {progress.fetched}/{progress.total}
        </div>
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{
              width: `${progress.total > 0 ? (progress.fetched / progress.total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    );
  }

  // Enriched view — the actual useful timeline
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
        <div className="type-secondary text-muted-foreground">
          {/* read-gate-exempt: this is the tally of versions whose read succeeded, with the failed ones counted beside it */}
          {enrichedVersions.filter((v) => v.snapshotLoaded).length} of{" "}
          {versions.length} versions loaded
          {failedVersions.length > 0 && (
            <span className="text-destructive">
              {" "}
              · {failedVersions.length} could not be read
              <ErrorAlchemyMenu error={failureReason ?? "Some version snapshots could not be read"} />
            </span>
          )}
        </div>
      </div>

      {timeline(true)}

      <div className="h-[50dvh]" />
      {duplicateFlow.dialog}
    </div>
  );
}

/** What changed at this version: the contract-break badge + menu, then the changed fields. */
function VersionChanges({ agentId, version }: { agentId: string; version: EnrichedVersion }) {
  const diff = version.diffSummary;
  const changedFields = diff?.root.filter((n) => n.changeType !== "unchanged") ?? [];
  return (
    <div className="space-y-1">
      <ContractBreak agentId={agentId} version={version} />
      {diff && changedFields.length > 0 ? (
        <ChipSet>
          {changedFields.map((n) => (
            <Chip
              key={n.key}
              tone={
                n.changeType === "added"
                  ? "success"
                  : n.changeType === "removed"
                    ? "destructive"
                    : "warning"
              }
              label={`${humanizeIdentifier(n.key) || n.key}${
                n.changeType === "added" ? " +" : n.changeType === "removed" ? " −" : ""
              }`}
            />
          ))}
        </ChipSet>
      ) : diff && changedFields.length === 0 ? (
        <span className="text-muted-foreground">No changes</span>
      ) : !version.snapshotLoaded ? null : (
        <span className="text-muted-foreground">First version</span>
      )}
    </div>
  );
}

/** The contract-break badge (auto or declared) and the menu that declares one. */
function ContractBreak({ agentId, version }: { agentId: string; version: EnrichedVersion }) {
  // Optimistic mirror of the manual declaration — the RPC is the authority.
  const [declared, setDeclared] = useState<string | null>(
    version.contract_break_declared ?? null,
  );

  async function declareBreak(kind: "input" | "output" | "both" | null) {
    const previous = declared;
    setDeclared(kind);
    const { error } = await supabase.rpc("agx_declare_contract_break", {
      p_agent_id: agentId,
      p_version_number: version.version_number,
      p_kind: kind ?? undefined,
    });
    if (error) {
      setDeclared(previous);
      toast.error(`Couldn't record the contract break: ${error.message}`);
    } else {
      toast.success(
        kind
          ? `v${version.version_number} marked as a ${kind} contract break.`
          : `Contract-break declaration cleared for v${version.version_number}.`,
      );
    }
  }

  const autoChange = version.contract_change || null;
  const effectiveChange = declared ?? autoChange;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {effectiveChange && (
        <Badge
          tone="warning"
          title={
            declared
              ? "Manually declared: the way this agent is used could break at this version."
              : "The declared input/output structure changed at this version — pinned callers and saved sample inputs may no longer fit."
          }
        >
          {`Contract: ${effectiveChange}${declared ? " (declared)" : ""}`}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            icon={<ShieldAlert />}
            aria-label="Mark this version as a contract break the hashes cannot see (e.g. a prompt-level output change)"
            variant="quiet"
            title="Mark this version as a contract break the hashes cannot see (e.g. a prompt-level output change)"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => void declareBreak("input")}>
            Declare input break
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void declareBreak("output")}>
            Declare output break
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void declareBreak("both")}>
            Declare input + output break
          </DropdownMenuItem>
          {declared && (
            <DropdownMenuItem onClick={() => void declareBreak(null)}>
              Clear declaration
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
