import { useState } from "react";
import { ArrowDown, ArrowUp, Crown } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { promoteOrder } from "../service";
import type { BattleView, Lane } from "../types";

/** Start from the measured ranking, then the lanes it left out in battle order. */
function suggested(battle: BattleView): string[] {
  const ranked = battle.summary?.ranking ?? [];
  const rest = battle.lanes.map((l) => l.lane_id).filter((id) => !ranked.includes(id));
  return [...ranked, ...rest];
}

/**
 * Promote an order for the job from what this battle measured. The router still runs direct sources
 * before middlemen (R-9) and only then follows this order, so the panel says when that overrides it.
 */
export function PromotePanel({ battle, onPromoted }: { battle: BattleView; onPromoted: () => void }) {
  const dispatch = useAppDispatch();
  const [order, setOrder] = useState<string[]>(() => suggested(battle));
  const [busy, setBusy] = useState(false);
  const byId = new Map<string, Lane>(battle.lanes.map((l) => [l.lane_id, l]));
  const finished = battle.status === "completed" || battle.status === "failed" || battle.status === "cancelled";
  const brokerAboveDirect = order.some((id, i) => {
    const lane = byId.get(id);
    return lane?.via === "treg" && order.slice(i + 1).some((later) => byId.get(later)?.via === "direct");
  });

  const move = (index: number, by: -1 | 1) => {
    const next = [...order];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const promote = async () => {
    const ok = await confirm({
      title: "Promote this order?",
      description: `The router will try these sources in this order for ${battle.jobKey}.`,
      confirmLabel: "Promote",
    });
    if (!ok) return;
    setBusy(true);
    const result = await promoteOrder(dispatch, battle.id, order);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Order promoted");
    onPromoted();
  };

  const last = battle.promotions[battle.promotions.length - 1];
  return (
    <section className="flex flex-col gap-2" aria-label="Promote an order">
      <h2 className="text-sm font-semibold text-foreground">Order for this job</h2>
      <ol className="flex flex-col gap-1">
        {order.map((id, i) => {
          const lane = byId.get(id);
          if (!lane) return null;
          return (
            <li key={id} className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-sm">
              <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{lane.label}</span>
              <Badge tone={lane.via === "treg" ? "warning" : "success"}>{lane.via === "treg" ? "treg" : "Direct"}</Badge>
              <Button variant="quiet" aria-label="Move up" disabled={i === 0 || !finished} onClick={() => move(i, -1)} icon={<ArrowUp />} />
              <Button variant="quiet" aria-label="Move down" disabled={i === order.length - 1 || !finished} onClick={() => move(i, 1)} icon={<ArrowDown />} />
            </li>
          );
        })}
      </ol>
      {brokerAboveDirect && <p className="text-xs text-muted-foreground">Direct sources still run before treg.</p>}
      <div className="flex items-center gap-3">
        <Button variant="primary" icon={<Crown />} disabled={!finished || busy} onClick={() => void promote()}>
          Promote this order
        </Button>
        {last && (
          <span className="text-xs text-muted-foreground">
            Last promoted {formatAbsoluteDate(last.at, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>
    </section>
  );
}
