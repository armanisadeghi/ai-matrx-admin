"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { useListViewPrefs } from "@/lib/list-views/useListViewPrefs";
import { formatRelativeTime } from "@/utils/datetime";
import { loadControlOverview } from "./service";
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
  const query = useQuery({ queryKey: [...TOOL_CONTROL_QUERY_KEY, "overview"], queryFn: loadControlOverview, refetchOnWindowFocus: true });
  const { prefs: viewPrefs, setPrefs: setViewPrefs } = useListViewPrefs("tool-control-tools");
  const [filter, setFilter] = useState<StateFilter>("all");
  const rows = query.data ? rollupTools(query.data.entries, query.data.endpoints, query.data.cards7) : [];
  const count = (s: StateFilter) => rows.filter((r) => (s === "off" ? r.state === "off" : r.state === s)).length;
  const visible = filter === "all" ? rows : rows.filter((r) => r.state === filter);
  const loading = query.isFetching && !query.data;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  return (
    <div className="min-h-0 flex-1">
      <MatrxDataTable
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
                {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
