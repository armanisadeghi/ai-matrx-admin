import { AlertTriangle, Check, CircleSlash, Clock, Loader2, Minus, X } from "lucide-react";
import { Tile } from "@ai-matrx/design-system/controls";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { formatMs, isStalled, reasonLabel, statusLabel } from "../derive";
import type { CellView } from "../types";

const ICON = {
  succeeded: <Check className="text-emerald-500" />,
  empty: <Minus className="text-amber-500" />,
  failed: <X className="text-rose-500" />,
  refused: <CircleSlash className="text-rose-500" />,
  cancelled: <CircleSlash />,
  running: <Loader2 className="animate-spin text-primary" />,
  queued: <Clock />,
} as const;

/** One lane × one subject: did it answer, how fast, what it cost, how many fields came back. */
export function CellTile({
  cell,
  hideCost,
  now,
  leaseSeconds,
  onOpen,
}: {
  cell: CellView | undefined;
  hideCost: boolean;
  now: number;
  leaseSeconds: number | null;
  onOpen: (cell: CellView) => void;
}) {
  if (!cell) return <div className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">—</div>;
  const filled = cell.answerFields.filter((f) => f.filled).length;
  const stalled = isStalled(cell, now, leaseSeconds);
  const answered = cell.status === "succeeded" || cell.status === "empty";
  const line = answered
    ? [cell.status === "succeeded" ? `${filled} fields` : "nothing found", hideCost ? null : formatAdminUsd(cell.costUsd, { digits: "price" })]
        .filter(Boolean)
        .join(" · ")
    : reasonLabel(cell);
  return (
    <Tile
      layout="row"
      icon={stalled ? <AlertTriangle className="text-amber-500" /> : ICON[cell.status]}
      title={stalled ? "Stalled" : cell.errorCode === "void_evidence" ? "Void" : statusLabel(cell.status)}
      line={line || undefined}
      end={<span className="tabular-nums text-xs text-muted-foreground">{X
      onClick={() => onOpen(cell)}
    />
  );
}
