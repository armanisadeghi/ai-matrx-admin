"use client";

// Intelligence › System processes: the durable queue behind platform AI work nobody sees (naming a chat today).
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Badge, Button, KpiGrid, KpiTile, type KpiTone } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { readOf, RecordId } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";
import { fetchQueue, STATES, type QueueItem, type QueueState } from "./systemProcesses";

const STATE_LABEL: Record<QueueState, string> = {
  pending: "Pending",
  in_progress: "In progress",
  succeeded: "Succeeded",
  failed: "Failed",
  dead_letter: "Dead letter",
};
const STATE_TONE: Record<QueueState, KpiTone> = {
  pending: "neutral",
  in_progress: "neutral",
  succeeded: "good",
  failed: "warn",
  dead_letter: "bad",
};
const STATE_HINT: Record<QueueState, string> = {
  pending: "Waiting for its due time or a drain.",
  in_progress: "Claimed by a drain, lease not yet expired.",
  succeeded: "Settled, including skipped outcomes.",
  failed: "Failed an attempt; will retry with backoff.",
  dead_letter: "Out of attempts; filed on the errors surface.",
};

type BadgeTone = "neutral" | "warning" | "destructive" | "success" | "info";
const STATE_BADGE: Record<string, BadgeTone> = {
  pending: "neutral",
  in_progress: "info",
  succeeded: "success",
  failed: "warning",
  dead_letter: "destructive",
};

function knobOn(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  return value === "true";
}

const COLUMNS: MatrxColumnDef<QueueItem>[] = [
  { id: "process", accessorKey: "process", header: "Process", width: 170, filter: "select" },
  {
    id: "subjectId",
    accessorKey: "subjectId",
    header: "Conversation",
    width: 300,
    filter: "text",
    cell: (r) =>
      r.subjectId ? (
        <RecordId value={r.subjectId} label="Conversation" token="conversation" />
      ) : (
        "—"
      ),
  },
  {
    id: "state",
    accessorKey: "state",
    header: "State",
    width: 120,
    filter: "select",
    cell: (r) => <Badge tone={STATE_BADGE[r.state] ?? "neutral"}>{r.state.replace("_", " ")}</Badge>,
  },
  { id: "outcome", accessorKey: "outcome", header: "Outcome", width: 210, filter: "select" },
  { id: "attempts", accessorKey: "attempts", header: "Attempts", width: 90, align: "right", cell: (r) => `${r.attempts}/${r.maxAttempts}` },
  { id: "due", accessorKey: "due", header: "Due", width: 160, filter: "date", format: { id: "datetime" } },
  { id: "updatedAt", accessorKey: "updatedAt", header: "Updated", width: 160, filter: "date", format: { id: "datetime" } },
  { id: "error", accessorKey: "error", header: "Error", width: 360, filter: "text" },
];

export function SystemProcessesBoard() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["system-process-queue"],
    queryFn: fetchQueue,
  });
  const items = data?.items ?? [];
  const knobs = new Map((data?.knobs ?? []).map((k) => [k.key, k.value]));

  const counts: Record<string, number> = {};
  for (const i of items) counts[i.state] = (counts[i.state] ?? 0) + 1;

  const byProcess = new Map<string, { total: number; outcomes: Map<string, number> }>();
  for (const i of items) {
    const p = byProcess.get(i.process) ?? { total: 0, outcomes: new Map<string, number>() };
    p.total += 1;
    if (i.outcome) p.outcomes.set(i.outcome, (p.outcomes.get(i.outcome) ?? 0) + 1);
    byProcess.set(i.process, p);
  }
  const processes = [...byProcess.entries()].sort(([a], [b]) => a.localeCompare(b));

  const read = readOf({ loading: isLoading, error: error ? String(error) : null }, { what: "the queue" });
  const globalOn = knobOn(knobs.get("enabled"));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto" data-matrx-page-scroll="">
      <KpiGrid className="lg:grid-cols-5">
        {STATES.map((s) => (
          <KpiTile
            key={s}
            label={STATE_LABEL[s]}
            value={isLoading || error ? null : formatCount(counts[s] ?? 0)}
            hint={STATE_HINT[s]}
            tone={(counts[s] ?? 0) > 0 ? STATE_TONE[s] : "neutral"}
            loading={isLoading}
            read={read}
          />
        ))}
      </KpiGrid>

      <div className="grid gap-2 md:grid-cols-2">
        {processes.map(([key, p]) => {
          const on = knobOn(knobs.get(`${key}.enabled`));
          return (
            <div key={key} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="type-label">{key}</span>
                <Badge tone={on === null ? "neutral" : on && globalOn !== false ? "success" : "warning"}>
                  {on === null ? "Knob unknown" : on && globalOn !== false ? "On" : "Off"}
                </Badge>
                <span className="ml-auto type-meta">{formatCount(p.total)} items</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...p.outcomes.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([o, n]) => (
                    <Badge key={o} tone={o.startsWith("skipped") ? "neutral" : "success"}>
                      {o} {n}
                    </Badge>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="min-h-[420px] flex-1">
        <MatrxDataTable
          data={items}
          columns={COLUMNS}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          tableId="system-process-queue-admin"
          read={read}
          emptyState={{ title: "No queue items yet" }}
          toolbar={{
            title: "Queue items",
            search: true,
            searchPlaceholder: "Search conversation, outcome, error…",
            actions: (
              <Button variant="quiet" icon={<RefreshCw />} disabled={isFetching} onClick={() => void refetch()}>
                Refresh
              </Button>
            ),
          }}
        />
      </div>
    </div>
  );
}
