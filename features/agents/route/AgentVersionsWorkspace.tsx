"use client";

import { lazy, Suspense, useEffect, useState, useTransition } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchAgentVersionHistory,
  fetchAgentVersionSnapshot,
  promoteAgentVersion,
} from "@/features/agents/redux/agent-definition/thunks";
import type { AgentVersionHistoryItem } from "@/features/agents/redux/agent-definition/thunks";
import {
  selectAgentById,
  selectAgentMessages,
  selectVersionsByParentAgentId,
} from "@/features/agents/redux/agent-definition/selectors";
import type { AgentDefinition } from "@/features/agents/types/agent-definition.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Clock,
  ArrowUpCircle,
  MessageSquare,
  Webhook,
  Variable,
  Wrench,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

const ReactDiffViewer = lazy(() => import("react-diff-viewer-continued"));

function extractTextContent(msg: AgentDefinitionMessage): string {
  if (!msg.content || !Array.isArray(msg.content)) return "";
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

function allMessagesText(
  messages: AgentDefinitionMessage[] | undefined,
): string {
  if (!messages || messages.length === 0) return "";
  return messages
    .map((m) => `[${m.role.toUpperCase()}]\n${extractTextContent(m)}`)
    .join("\n\n---\n\n");
}

function settingsText(settings: AgentDefinition["settings"]): string {
  if (!settings || Object.keys(settings).length === 0)
    return "No settings configured";
  return Object.entries(settings)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
}

function toolsText(
  tools: string[] | undefined,
  customTools: AgentDefinition["customTools"] | undefined,
): string {
  const lines: string[] = [];
  tools?.forEach((t) => lines.push(t));
  customTools?.forEach((t) => lines.push(`${t.name} (custom)`));
  return lines.length > 0 ? lines.join("\n") : "No tools configured";
}

function variablesText(vars: AgentDefinition["variableDefinitions"]): string {
  if (!vars || vars.length === 0) return "No variables defined";
  return vars
    .map((v) => {
      let line = `{{${v.name}}}`;
      if (v.type) line += ` [${v.type}]`;
      if (v.defaultValue) line += ` = ${String(v.defaultValue)}`;
      return line;
    })
    .join("\n");
}

interface AgentVersionsWorkspaceProps {
  agentId: string;
  initialVersion?: number;
}

export function AgentVersionsWorkspace({
  agentId,
  initialVersion,
}: AgentVersionsWorkspaceProps) {
  const dispatch = useAppDispatch();
  const [versions, setVersions] = useState<AgentVersionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(
    initialVersion ?? null,
  );
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [, startTransition] = useTransition();

  const liveAgent = useAppSelector((state) => selectAgentById(state, agentId));
  const liveMessages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );
  const snapshotRecords = useAppSelector((state) =>
    selectVersionsByParentAgentId(state, agentId),
  );

  const snapshot = selectedVersion
    ? snapshotRecords.find((r) => r.version === selectedVersion)
    : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dispatch(fetchAgentVersionHistory({ agentId, limit: 100 }))
      .unwrap()
      .then((data) => {
        if (!cancelled) {
          setVersions(data);
          if (!selectedVersion && data.length > 0) {
            setSelectedVersion(initialVersion ?? data[0].version_number);
          }
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    if (!selectedVersion) return;
    const alreadyLoaded = snapshotRecords.some(
      (r) => r.version === selectedVersion,
    );
    if (alreadyLoaded) return;

    setSnapshotLoading(true);
    dispatch(
      fetchAgentVersionSnapshot({
        agentId,
        version: selectedVersion,
      }),
    )
      .unwrap()
      .finally(() => setSnapshotLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, agentId]);

  const handlePromote = async () => {
    if (!selectedVersion) return;
    setPromoting(true);
    try {
      const result = await dispatch(
        promoteAgentVersion({ agentId, version: selectedVersion }),
      ).unwrap();
      if (result.success) {
        toast.success(`Promoted v${selectedVersion} to current`);
      } else {
        toast.error(result.error ?? "Failed to promote version");
      }
    } catch (err) {
      toast.error("Failed to promote version");
    } finally {
      setPromoting(false);
      setShowPromoteDialog(false);
    }
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
        No version history found for this agent.
      </div>
    );
  }

  const selectedVersionItem = versions.find(
    (v) => v.version_number === selectedVersion,
  );

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      {/* Version selector toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50">
        <Select
          value={selectedVersion?.toString() ?? ""}
          onValueChange={(val) =>
            startTransition(() => setSelectedVersion(parseInt(val, 10)))
          }
        >
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue placeholder="Select version..." />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem
                key={v.version_number}
                value={v.version_number.toString()}
              >
                <span className="font-mono tabular-nums">
                  v{v.version_number}
                </span>
                {v.change_note && (
                  <span className="ml-2 text-muted-foreground truncate">
                    — {v.change_note}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedVersionItem && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(selectedVersionItem.changed_at).toLocaleString()}
          </div>
        )}

        <div className="flex-1" />

        {liveAgent?.version != null &&
          selectedVersion != null &&
          selectedVersion !== liveAgent.version && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => setShowPromoteDialog(true)}
              disabled={promoting}
            >
              {promoting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUpCircle className="w-3.5 h-3.5" />
              )}
              Promote v{selectedVersion} to Current
            </Button>
          )}

        {liveAgent?.version != null &&
          selectedVersion === liveAgent.version && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-3 h-3" />
              Current Version
            </Badge>
          )}
      </div>

      {/* Diff content */}
      {snapshotLoading ? (
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : snapshot && liveAgent ? (
        <div className="flex-1 overflow-y-auto">
          <DiffSection
            title="Messages"
            icon={<MessageSquare className="w-4 h-4" />}
            oldValue={allMessagesText(snapshot.messages)}
            newValue={allMessagesText(liveMessages)}
            oldLabel={`v${snapshot.version}`}
            newLabel="Current"
          />
          <DiffSection
            title="Model"
            icon={<Webhook className="w-4 h-4" />}
            oldValue={snapshot.modelId ?? "Default"}
            newValue={liveAgent.modelId ?? "Default"}
            oldLabel={`v${snapshot.version}`}
            newLabel="Current"
          />
          <DiffSection
            title="Variables"
            icon={<Variable className="w-4 h-4" />}
            oldValue={variablesText(snapshot.variableDefinitions)}
            newValue={variablesText(liveAgent.variableDefinitions)}
            oldLabel={`v${snapshot.version}`}
            newLabel="Current"
          />
          <DiffSection
            title="Tools"
            icon={<Wrench className="w-4 h-4" />}
            oldValue={toolsText(snapshot.tools, snapshot.customTools)}
            newValue={toolsText(liveAgent.tools, liveAgent.customTools)}
            oldLabel={`v${snapshot.version}`}
            newLabel="Current"
          />
          <DiffSection
            title="Settings"
            icon={<Settings className="w-4 h-4" />}
            oldValue={settingsText(snapshot.settings)}
            newValue={settingsText(liveAgent.settings)}
            oldLabel={`v${snapshot.version}`}
            newLabel="Current"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Select a version to see differences
        </div>
      )}

      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Version</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current agent configuration with the content
              from v{selectedVersion}. The current configuration will be saved
              as a new version in the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={promoting}>
              {promoting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Promote v{selectedVersion}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DiffSection({
  title,
  icon,
  oldValue,
  newValue,
  oldLabel,
  newLabel,
}: {
  title: string;
  icon: React.ReactNode;
  oldValue: string;
  newValue: string;
  oldLabel: string;
  newLabel: string;
}) {
  const hasChanges = oldValue !== newValue;

  return (
    <div className="border-b border-border">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium",
          hasChanges ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {icon}
        {title}
        {hasChanges ? (
          <Badge variant="destructive" className="text-[0.5625rem] px-1.5 py-0">
            Changed
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[0.5625rem] px-1.5 py-0">
            Unchanged
          </Badge>
        )}
      </div>
      {hasChanges && (
        <div className="px-2 pb-2">
          <div className="rounded-lg border border-border overflow-hidden text-xs">
            <Suspense
              fallback={<Skeleton className="h-32 w-full rounded-none" />}
            >
              <ReactDiffViewer
                oldValue={oldValue}
                newValue={newValue}
                splitView
                useDarkTheme
                leftTitle={oldLabel}
                rightTitle={newLabel}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
