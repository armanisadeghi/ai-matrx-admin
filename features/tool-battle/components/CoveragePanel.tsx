import { useState } from "react";
import { Switch } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { laneName } from "../derive";
import type { BattleView, Lane } from "../types";

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
  const shown = differencesOnly ? differing : rows;
  return (
    <section className="flex flex-col gap-2" aria-label="Field coverage">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Fields <span className="ml-1 font-normal text-muted-foreground">{differing.length} differ of {rows.length}</span>
        </h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Differences only
          <Switch checked={differencesOnly} onCheckedChange={setDifferencesOnly} aria-label="Differences only" />
        </label>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {rows.length === 0 ? "No answers yet." : "Every source returned the same fields."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Field</th>
                {lanes.map((l) => (
                  <th key={l.lane_id} className="px-3 py-1.5 font-medium">{laneName(battle, l, revealed)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.path} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-1.5 font-mono text-xs text-foreground">{r.path}</td>
                  {lanes.map((l) => {
                    const rate = r.rates[l.lane_id];
                    return (
                      <td key={l.lane_id} className="px-3 py-1.5">
                        {rate === null || rate === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
                              <span
                                className={cn("block h-full", rate === 0 ? "bg-rose-500" : "bg-emerald-500")}
                                style={{ width: `${Math.max(rate, 0.04) * 100}%` }}
                              />
                            </span>
                            <span className={cn("tabular-nums text-xs", rate === 0 ? "text-rose-500" : "text-foreground")}>
                              {Math.round(rate * 100)}%
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
