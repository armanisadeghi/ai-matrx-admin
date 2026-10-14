"use client";

/**
 * AI test mode desk — the saved AI answers test sessions replay
 * (common-docs/policies/ai-test-mode.md): name a baseline, pin it as its job's
 * stand-in, archive it, or set a stand-in directly; spend saved on top.
 * Every door is aidream `/admin/ai-test-mode/*` (features/ai-test-mode/service.ts).
 */

import { useEffect, useState } from "react";
import { Pin, Plus, Trash2 } from "lucide-react";
import { Button, Input, Switch, Textarea } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef, MatrxDataTableCopyConfig } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import {
  archiveAiTestBaseline,
  fetchAiTestReport,
  listAiTestBaselines,
  patchAiTestBaseline,
  setAiTestStandIn,
  type AiTestBaseline,
  type AiTestReport,
} from "../service";

const PAGE_LOCATION = "AI Matrx Admin — AI Test Mode (/administration/ai/ai-test-mode)";

const baselineCopy: MatrxDataTableCopyConfig<AiTestBaseline> = {
  label: "Saved AI answer",
  listLabel: "Saved AI answers",
  location: PAGE_LOCATION,
  rowKind: "ai-test-baseline",
  listKind: "ai-test-baselines",
  rowDescription: "One saved answer a test session can replay (ops.test_replay_cache).",
  listDescription: "Every live saved answer for mandate steps.",
  humanRow: (b) =>
    [
      `ID: ${b.id}`,
      `Mandate: ${b.mandate_key ?? "—"}`,
      `Label: ${b.label ?? "—"}`,
      `Stand-in: ${b.stand_in ? "yes" : "no"}`,
      `Saved: ${b.saved_at ?? "—"}`,
      `Replays: ${b.hit_count}`,
    ].join("\n"),
  rowAttributes: (b) => ({ id: b.id, mandate_key: b.mandate_key ?? "" }),
};

function when(value: string | null): string {
  return value ? formatAbsoluteDate(value, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function LabelCell({ baseline, onSave }: { baseline: AiTestBaseline; onSave: (label: string) => void }) {
  const [draft, setDraft] = useState(baseline.label ?? "");
  const commit = () => {
    if (draft.trim() !== (baseline.label ?? "")) onSave(draft.trim());
  };
  return (
    <Input
      aria-label="Label"
      value={draft}
      placeholder="Name it"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}

function SetStandIn({ onDone }: { onDone: () => void }) {
  const [mandateKey, setMandateKey] = useState("");
  const [label, setLabel] = useState("");
  const [json, setJson] = useState('{\n  "final_text": ""\n}');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(null);
    let result: unknown;
    try {
      result = JSON.parse(json);
    } catch (err) {
      setError(`Not JSON: ${message(err)}`);
      return;
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      setError("Result must be an object");
      return;
    }
    setBusy(true);
    try {
      await setAiTestStandIn(mandateKey.trim(), {
        ...(label.trim() ? { label: label.trim() } : {}),
        result: result as Record<string, unknown>,
      });
      onDone();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3" data-testid="ai-test-set-stand-in">
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Mandate key" mono placeholder="mandate key" value={mandateKey} onChange={(e) => setMandateKey(e.target.value)} className="w-72" />
        <Input aria-label="Label" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="w-56" />
      </div>
      <Textarea aria-label="Result JSON" mono minHeight={120} value={json} onChange={(e) => setJson(e.target.value)} />
      <div className="flex items-center gap-2">
        <Button variant="primary" icon={<Pin />} disabled={busy || !mandateKey.trim()} onClick={() => void submit()}>
          Set stand-in
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}

export default function AiTestModeDesk() {
  const [rows, setRows] = useState<AiTestBaseline[]>([]);
  const [report, setReport] = useState<AiTestReport | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([listAiTestBaselines(), fetchAiTestReport()])
      .then(([baselines, rep]) => {
        if (cancelled) return;
        setRows(baselines);
        setReport(rep);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const act = async (work: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await work();
      refresh();
    } catch (err) {
      setActionError(message(err));
    }
  };

  const columns: MatrxColumnDef<AiTestBaseline>[] = [
    {
      id: "label",
      accessorKey: "label",
      header: "Label",
      width: 220,
      cell: (b) => <LabelCell key={`${b.id}:${b.label ?? ""}`} baseline={b} onSave={(label) => void act(() => patchAiTestBaseline(b.id, { label }))} />,
    },
    { id: "mandate", accessorKey: "mandate_key", header: "Mandate", filter: "select", width: 240, cell: (b) => <span className="font-mono text-xs">{b.mandate_key ?? "—"}</span> },
    { id: "saved", accessorKey: "saved_at", header: "Saved", filter: "date", width: 170, cell: (b) => when(b.saved_at) },
    { id: "cost", accessorKey: "original_cost_usd", header: "Cost", width: 90, cell: (b) => <span className="tabular-nums">{formatAdminUsd(b.original_cost_usd)}</span> },
    { id: "replays", accessorKey: "hit_count", header: "Replays", width: 90, cell: (b) => <span className="tabular-nums">{b.hit_count}</span> },
    { id: "saved_usd", accessorKey: "saved_usd", header: "Saved $", width: 100, cell: (b) => <span className="tabular-nums">{formatAdminUsd(b.saved_usd)}</span> },
    { id: "last", accessorKey: "last_replayed_at", header: "Last replay", filter: "date", width: 170, mobileHidden: true, cell: (b) => when(b.last_replayed_at) },
    {
      id: "stand_in",
      accessorKey: "stand_in",
      header: "Stand-in",
      width: 90,
      cell: (b) => (
        <Switch
          aria-label="Pin as stand-in"
          checked={b.stand_in}
          onCheckedChange={(checked) => void act(() => patchAiTestBaseline(b.id, { stand_in: checked }))}
        />
      ),
    },
    {
      id: "archive",
      header: "",
      width: 56,
      filter: false,
      cell: (b) => (
        <Button variant="quiet" aria-label="Archive" icon={<Trash2 />} onClick={() => void act(() => archiveAiTestBaseline(b.id))} />
      ),
    },
  ];

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto pb-safe">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm" data-testid="ai-test-report">
            <span>
              Saved <span className="font-semibold tabular-nums">{formatAdminUsd(report?.total_saved_usd ?? 0)}</span>
            </span>
            <span>
              Replays <span className="font-semibold tabular-nums">{report?.total_replays ?? 0}</span>
            </span>
            <span>
              Baselines <span className="font-semibold tabular-nums">{rows.length}</span>
            </span>
            <Button variant="outline" icon={<Plus />} className="ml-auto" onClick={() => setAdding((a) => !a)}>
              Set stand-in
            </Button>
          </div>
          {adding ? (
            <SetStandIn
              onDone={() => {
                setAdding(false);
                refresh();
              }}
            />
          ) : null}
          {actionError ? <div className="text-xs text-destructive">{actionError}</div> : null}
          <MatrxDataTable
            data={rows}
            columns={columns}
            getRowId={(b) => b.id}
            isLoading={isLoading && rows.length === 0}
            isFetching={isLoading && rows.length > 0}
            pageSize={0}
            viewTabs={false}
            copy={{ ...baselineCopy, listAttributes: (visible) => ({ count: visible.length }) }}
            detail={{ enabled: false }}
            window={{ enabled: false }}
            read={readOf({ isLoading, error }, { what: "saved AI answers", onRetry: refresh })}
            emptyState={{ title: "No saved answers", description: "A real run in replay or stand-in mode saves one." }}
            toolbar={{ title: "Saved AI answers", search: true, refresh: { onRefresh: refresh } }}
          />
        </div>
      </div>
    </div>
  );
}
