import { cn } from "@/lib/utils";
import { Badge } from "@ai-matrx/design-system/controls";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { formatMs, formatOf, formatPercent, formatPoints, laneName, type Mark } from "../derive";
import type { BattleView, Lane, LaneRollup } from "../types";

export interface LaneMarks {
  success: Mark;
  speed: Mark;
  cost: Mark;
  fields: Mark;
}

function tone(mark: Mark): string {
  if (mark === "best") return "text-emerald-500 font-semibold";
  if (mark === "worst") return "text-rose-500 font-semibold";
  return "text-foreground";
}

function Metric({ label, value, sub, mark }: { label: string; value: string; sub?: string; mark?: Mark }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", tone(mark ?? null))}>
        {value}
        {sub ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{sub}</span> : null}
      </span>
    </div>
  );
}

/** One source's column header: who it is and the numbers that decide it. Identity hides while blind. */
export function LaneCard({
  battle,
  lane,
  rollup,
  marks,
  revealed,
  place,
}: {
  battle: BattleView;
  lane: Lane;
  rollup: LaneRollup | undefined;
  marks: LaneMarks;
  revealed: boolean;
  place: number | null;
}) {
  const hidden = battle.blind && !revealed;
  const n = rollup?.cells ?? 0;
  const rate = rollup?.success_rate ?? null;
  return (
    <div className="flex h-full flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{laneName(battle, lane, revealed)}</div>
          {!hidden && (
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge tone={lane.via === "treg" ? "warning" : "success"}>{lane.via === "treg" ? "treg" : "Direct"}</Badge>
              {lane.provider_slug ? <Badge>{lane.provider_slug}</Badge> : null}
            </div>
          )}
        </div>
        {place !== null ? (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
            #{place}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-emerald-500" style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
        </div>
        <Metric
          label="Answered"
          value={n ? formatPercent(rate) : "—"}
          sub={n ? formatOf(rollup?.succeeded ?? 0, n) : undefined}
          mark={marks.success}
        />
        <Metric
          label="Speed"
          value={formatMs(rollup?.p50_ms)}
          sub={rollup?.p95_ms != null ? `slowest ${formatMs(rollup.p95_ms)}` : undefined}
          mark={marks.speed}
        />
        <Metric
          label="Per answer"
          value={hidden ? "hidden" : formatAdminUsd(rollup?.cost_per_success_usd ?? null, { digits: "price" })}
          sub={hidden ? undefined : formatPoints(rollup?.points_per_success)}
          mark={hidden ? null : marks.cost}
        />
        <Metric
          label="Fields"
          value={rollup?.mean_filled_fields != null ? rollup.mean_filled_fields.toFixed(1) : "—"}
          sub="avg filled"
          mark={marks.fields}
        />
        {(rollup?.empty ?? 0) + (rollup?.failed ?? 0) + (rollup?.refused ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5 text-xs text-muted-foreground">
            {rollup?.empty ? <span>{rollup.empty} no result</span> : null}
            {rollup?.failed ? <span>· {rollup.failed} failed</span> : null}
            {rollup?.refused ? <span>· {rollup.refused} refused</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}
