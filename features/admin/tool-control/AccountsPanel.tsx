"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { formatRelativeTime } from "@/utils/datetime";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { loadControlOverview, mustChange, setAccountState } from "./service";
import { TOOL_CONTROL_PATH, TOOL_CONTROL_QUERY_KEY } from "./paths";
import { isCheckRequired, stateWords } from "./words";
import type { ProviderRow } from "./types";

interface AccountRow {
  provider: ProviderRow;
  sources: number;
  sourcesOn: number;
  changedAt: string | null;
}

/** The vendor accounts behind the Tools: pause one by hand, or turn a switched-off one back on after a check passed. */
export function AccountsPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [...TOOL_CONTROL_QUERY_KEY, "overview"], queryFn: loadControlOverview, refetchOnWindowFocus: true });
  const [busy, setBusy] = useState<string | null>(null);
  const loading = query.isFetching && !query.data;
  const error = query.error ? extractErrorMessage(query.error) : null;
  const rows: AccountRow[] = (query.data?.providers ?? []).map((provider) => {
    const eps = (query.data?.endpoints ?? []).filter((e) => e.provider_slug === provider.slug && e.state !== "retired");
    return {
      provider,
      sources: eps.length,
      sourcesOn: eps.filter((e) => e.state === "live").length,
      changedAt: provider.metadata?.control_log?.[0]?.at ?? null,
    };
  });

  const change = async (row: AccountRow, to: "live" | "paused") => {
    setBusy(row.provider.slug);
    try {
      if (to === "paused") {
        const ok = await confirm({
          title: `Pause ${row.provider.admin_name}?`,
          description: "Every Tool that uses this account stops using it until you resume it.",
          confirmLabel: "Pause",
        });
        if (!ok) return;
      }
      const result = await setAccountState(row.provider.slug, to);
      if (result.changed) toast.success(`Now ${result.state}`);
      else if (isCheckRequired(result.refusal)) toast.info("Check a source first", { description: "Open one of its Tools and run a check." });
      else toast.error(result.message);
    } catch (err) {
      toast.error("That did not happen", { description: extractErrorMessage(err) });
    } finally {
      setBusy(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
    }
  };

  const columns: MatrxColumnDef<AccountRow>[] = [
    { id: "name", accessorFn: (r) => r.provider.admin_name, header: "Account", width: 240 },
    { id: "state", accessorFn: (r) => stateWords(r.provider.state).label, header: "State", width: 130, filter: "select", tone: (r) => stateWords(r.provider.state).tone },
    { id: "direct", accessorFn: (r) => (r.provider.direct_account ? "Our own account" : "Through an aggregator"), header: "Reached", width: 190, filter: "select" },
    { id: "sources", accessorFn: (r) => `${r.sourcesOn} of ${r.sources}`, sortValue: (r) => r.sources, header: "Sources on", width: 120 },
    { id: "changed", accessorFn: (r) => (r.changedAt ? formatRelativeTime(r.changedAt) : "Never"), sortValue: (r) => (r.changedAt ? new Date(r.changedAt).getTime() : 0), header: "Last change", width: 140 },
  ];

  const accountsLabel = (n: number) => `${n} account${n === 1 ? "" : "s"}`;
  const { rowActionDefs, bulkActions } = defineRowVerbs<AccountRow>(
    [
      {
        id: "pause", icon: Pause, label: "Pause", tone: "destructive",
        appliesTo: (r) => r.provider.state === "live",
        unavailableTooltip: "Not on",
        disabled: (r) => busy === r.provider.slug,
        onClick: (r) => void change(r, "paused"),
        bulk: {
          done: "Paused",
          skipReason: (r) => (r.provider.state === "live" ? null : "Not on"),
          confirm: (t) => ({
            title: `Pause ${accountsLabel(t.ids.length)}?`,
            description: "Every Tool that uses these accounts stops using them until you resume them.",
            confirmLabel: "Pause",
            variant: "destructive",
          }),
          runOne: async (id) => mustChange(await setAccountState(id, "paused")),
        },
      },
      {
        id: "turn-on", icon: Play, label: "Turn on",
        appliesTo: (r) => r.provider.state !== "live",
        unavailableTooltip: "Already on",
        disabled: (r) => busy === r.provider.slug,
        onClick: (r) => void change(r, "live"),
        bulk: {
          done: "Turned on",
          skipReason: (r) => (r.provider.state === "live" ? "Already on" : null),
          confirm: (t) => ({
            title: `Turn on ${accountsLabel(t.ids.length)}?`,
            description: "Each account turns on only if a source behind it passed a check; the others are skipped and named.",
            confirmLabel: "Turn on",
          }),
          runOne: async (id) => mustChange(await setAccountState(id, "live")),
        },
      },
    ],
    { noun: "account", getRowId: (r) => r.provider.slug, getRowName: (r) => r.provider.admin_name },
  );
  const bulk = useTableBulkSelection<AccountRow>({
    noun: "account",
    rows,
    getRowId: (r) => r.provider.slug,
    getRowName: (r) => r.provider.admin_name,
    actions: bulkActions,
    standardBulkActions: false,
    onRefresh: () => {
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
    },
  });

  return (
    <div className="min-h-0 flex-1">
      <MatrxDataTable
        rowActionDefs={rowActionDefs}
        selection={bulk.selection}
        data={rows}
        columns={columns}
        getRowId={(r) => r.provider.slug}
        isLoading={loading}
        tableId="tool-control-accounts"
        read={readOf({ loading, error }, { what: "accounts" })}
        emptyState={{ title: "No accounts yet" }}
        toolbar={{
          title: "Accounts",
          search: true,
          searchPlaceholder: "Search accounts…",
          actions: (
            <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh">
              {query.isFetching ? <Spinner size="xs" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          ),
        }}
        copy={{
          label: "Account",
          listLabel: "Accounts",
          location: TOOL_CONTROL_PATH,
          rowKind: "tool-control-account",
          listKind: "tool-control-account",
          humanRow: (r) => `${r.provider.admin_name} · ${stateWords(r.provider.state).label} · ${r.sourcesOn} of ${r.sources} sources on`,
          agentRow: (r) => ({ slug: r.provider.slug, state: r.provider.state, sources: r.sources, sourcesOn: r.sourcesOn }),
        }}
      />
    </div>
  );
}
