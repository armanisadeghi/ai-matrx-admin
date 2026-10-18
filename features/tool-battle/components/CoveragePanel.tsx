import { useState } from "react";
import { Switch } from "@ai-matrx/design-system/controls";
import { LiteTable, type MatrxColumnDef } from "@ai-matrx/design-system/lite-table";
import { cn } from "@/lib/utils";
import { laneName } from "../derive";
import type { BattleView, Lane } from "../types";

/** Past this many paths, with almost none shared, the sources do not return one shape. */
const MIN_ROWS_TO_JUDGE = 40;
const MAX_SHARED_SHARE = 0.3;
const MAX_ROWS = 120;

/** Which fields each source returned: the share of its answers where the field was filled. */
export function CoveragePanel({
  battle,
  lanes,
  revealed,
}: {
  battle: BattleView;
  lanes: Lane[];
  revealed: boolean;
}) {
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const rows = battle.summary?.coverage ?? [];
  const differing = rows.filter((r) => {
    const rates = lanes.map((l) => r.rates[l.lane_id] ?? null).filter((x): x is number => x !== null);
    return rates.length > 1 && Math.max(...rates) !== Math.min(...rates);
  });
  // Sources that name their fields differently share almost no paths: a path-by-path diff would be noise.
  const shared = rows.filter((r) => lanes.filter((l) => (r.rates[l.lane_id] ?? 0) > 0).length > 1).length;
  const unlike = rows.length > MIN_ROWS_TO_JUDGE && shared / rows.length < MAX_SHARED_SHARE;
  const shown = (differencesOnly ? differing : rows).slice(0, MAX_ROWS);
  type Coverage = (typeof rows)[number];
  const columns: MatrxColumnDef<Coverage>[] = [
    { accessorKey: "path", header: "Field", className: "font-mono text-xs" },
    ...lanes.map(
      (l): MatrxColumnDef<Coverage> => ({
        id: l.lane_id,
        header: laneName(battle, l, revealed),
        accessorFn: (r) => r.rates[l.lane_id] ?? null,
        defaultSortDirection: "desc",
        cell: (r) => <Rate rate={r.rates[l.lane_id]} />,
      }),
    ),
  ];
  return (
    <section className="flex flex-col gap-2" aria-label="Field coverage">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Fields{unlike ? null : <span className="ml-1 font-normal text-muted-foreground">{differing.length} differ of {rows.length}</span>}
        </h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Differences only
          <Switch checked={differencesOnly} onCheckedChange={setDifferencesOnly} aria-label="Differences only" />
        </label>
      </div>
      {unlike ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Sources name their fields differently: {shared} of {rows.length} paths are shared.
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {rows.length === 0 ? "No answers yet." : "Every source returned the same fields."}
        </div>
      ) : (
        <LiteTable data={shown} columns={columns} getRowId={(r) => r.path} density="condensed" ariaLabel="Field coverage" />
      )}
    </section>
  );
}

function Rate({ rate }: { rate: number | null | undefined }) {
  if (rate === null || rate === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={cn("block h-full", rate === 0 ? "bg-rose-500" : "bg-emerald-500")}
          style={{ width: `${Math.max(rate, 0.04) * 100}%` }}
        />
      </span>
      <span className={cn("tabular-nums text-xs", rate === 0 ? "text-rose-500" : "text-foreground")}>{Math.round(rate * 100)}%</span>
    </span>
  );
}
