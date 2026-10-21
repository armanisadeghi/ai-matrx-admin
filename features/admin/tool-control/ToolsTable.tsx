"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { useListViewPrefs } from "@/lib/list-views/useListViewPrefs";
import { formatRelativeTime } from "@/utils/datetime";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { loadControlOverview, mustChange, setToolPaused } from "./service";
import { TOOL_CONTROL_PATH, TOOL_CONTROL_QUERY_KEY } from "./paths";
import { rollupTools, speedLabel, stateWords, successLabel, type ToolRow } from "./words";

type StateFilter = "all" | "off" | "paused" | "live";

const columns: MatrxColumnDef<ToolRow>[] = [
  { id: "name", accessorFn: (r) => r.name, header: "Tool", width: 260, href: (r) => `${TOOL_CONTROL_PATH}?tool=${r.tool_id}` },
  { id: "family", accessorFn: (r) => r.family, header: "Family", width: 130, filter: "select" },
  {
    id: "state",
    accessorFn: (r) => stateWords(r.state).label,
    header: "State",
    width: 110,
    filter: "select",
    tone: (r) => stateWords(r.state).tone,
  },
  {
    id: "sources",
    accessorFn: (r) => `${r.sourcesOn} of ${r.sources}`,
    sortValue: (r) => (r.sources ? r.sourcesOn / r.sources : 0),
    header: "Sources on",
    width: 120,
    tone: (r) => (r.sources > 0 && r.sourcesOn === 0 ? "danger" : r.sourcesOn < r.sources ? "warning" : undefined),
  },
  {
    id: "success",
    accessorFn: (r) => successLabel(r),
    sortValue: (r) => (r.samples ? r.decided / r.samples : -1),
    header: "Success, 7 days",
    width: 170,
  },
  { id: "speed", accessorFn: (r) => speedLabel(r.p50_ms), sortValue: (r) => r.p50_ms ?? Number.MAX_SAFE_INTEGER, header: "Typical speed", width: 130 },
  {
    id: "last",
    accessorFn: (r) => (r.last_success_at ? formatRelativeTime(r.last_success_at) : "Never"),
    sortValue: (r) => (r.last_success_at ? new Date(r.last_success_at).getTime() : 0),
    header: "Last worked",
    width: 140,
  },
];

export function ToolsTable() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [...TOOL_CONTROL_QUERY_KEY, "overview"], queryFn: loadControlOverview, refetchOnWindowFocus: true });
  const { prefs: viewPrefs, setPrefs: setViewPrefs } = useListViewPrefs("tool-control-tools");
  const [filter, setFilter] = useState<StateFilter>("all");
  const rows = query.data ? rollupTools(query.data.entries, query.data.endpoints, query.data.cards7) : [];
  const count = (s: StateFilter) => rows.filter((r) => (s === "off" ? r.state === "off" : r.state === s)).length;
  const visible = filter === "all" ? rows : rows.filter((r) => r.state === filter);
  const loading = query.isFetching && !query.data;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  const afterChange = async () => {
    await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: ["admin-attention"] })]);
  };
  const toolsLabel = (n: number) => `${n} Tool${n === 1 ? "" : "s"}`;
  const { rowActionDefs, bulkActions } = defineRowVerbs<ToolRow>(
    [
      {
        id: "pause", icon: Pause, label: "Pause", tone: "destructive",
        appliesTo: (r) => r.state === "live" || r.state === "off",
        unavailableTooltip: "Only a Tool that is on or off can be paused",
        onClick: async (r) => {
          const ok = await confirm({
            title: `Pause ${r.name}?`,
            description: "Every agent, workflow and chat using it is told it is paused. It stays paused until you resume it.",
            confirmLabel: "Pause",
          });
          if (!ok) return;
          try {
            const result = await setToolPaused(r.tool_id, true);
            toast.success(result.message);
          } catch (err) {
            toast.error("That did not happen", { description: extractErrorMessage(err) });
          }
          await afterChange();
        },
        bulk: {
          done: "Paused",
          skipReason: (r) => (r.state === "paused" ? "Already paused" : r.state === "live" || r.state === "off" ? null : "Not live yet"),
          confirm: (t) => ({
            title: `Pause ${toolsLabel(t.ids.length)}?`,
            description: "Every agent, workflow and chat using them is told they are paused. They stay paused until you resume them.",
            confirmLabel: "Pause",
            variant: "destructive",
          }),
          runOne: async (id) => mustChange(await setToolPaused(id, true)),
        },
      },
      {
        id: "resume", icon: Play, label: "Resume",
        appliesTo: (r) => r.state === "paused",
        unavailableTooltip: "Not paused",
        onClick: async (r) => {
          try {
            const result = await setToolPaused(r.tool_id, false);
            toast.success(result.message);
          } catch (err) {
            toast.error("That did not happen", { description: extractErrorMessage(err) });
          }
          await afterChange();
        },
        bulk: {
          done: "Resumed",
          skipReason: (r) => (r.state === "paused" ? null : "Not paused"),
          confirm: (t) => ({
            title: `Resume ${toolsLabel(t.ids.length)}?`,
            description: "They start serving agents, workflows and chats again.",
            confirmLabel: "Resume",
          }),
          runOne: async (id) => mustChange(await setToolPaused(id, false)),
        },
      },
    ],
    { noun: "Tool", getRowId: (r) => r.tool_id, getRowName: (r) => r.name },
  );
  const bulk = useTableBulkSelection<ToolRow>({
    noun: "Tool",
    rows: visible,
    getRowId: (r) => r.tool_id,
    getRowName: (r) => r.name,
    actions: bulkActions,
    standardBulkActions: false,
    onRefresh: () => void afterChange(),
  });

  return (
    <div className="min-h-0 flex-1">
      <MatrxDataTable
        rowActionDefs={rowActionDefs}
        selection={bulk.selection}
        data={visible}
        columns={columns}
        getRowId={(r) => r.tool_id}
        isLoading={loading}
        tableId="tool-control-tools"
        viewTabsStore={{ views: viewPrefs.savedViews ?? [], onChange: (savedViews) => setViewPrefs({ savedViews }) }}
        headerWrap="two-lines"
        read={readOf({ loading, error }, { what: "Tools" })}
        emptyState={{ title: "No Tools yet" }}
        toolbar={{
          title: "Tools",
          search: true,
          searchPlaceholder: "Search Tools…",
          actions: (
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<StateFilter>
                aria-label="State"
                value={filter}
                onValueChange={setFilter}
                data={[
                  { value: "all", label: "All" },
                  { value: "off", label: `Off ${count("off")}` },
                  { value: "paused", label: `Paused ${count("paused")}` },
                  { value: "live", label: "On" },
                ]}
              />
              <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh">
                {query.isFetching ? <Spinner size="xs" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          ),
        }}
        copy={{
          label: "Tool",
          listLabel: "Tools (this view)",
          location: TOOL_CONTROL_PATH,
          rowKind: "tool-control-tool",
          listKind: "tool-control-tool",
          humanRow: (r) => `${r.name} · ${stateWords(r.state).label} · ${r.sourcesOn} of ${r.sources} sources on · ${successLabel(r)}`,
          agentRow: (r) => ({ ...r, page: `${TOOL_CONTROL_PATH}?tool=${r.tool_id}` }),
        }}
      />
    </div>
  );
}
