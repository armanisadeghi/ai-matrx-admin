import { Check, X } from "lucide-react";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { formatMs, formatPoints, laneName, reasonLabel, statusLabel } from "../derive";
import type { BattleView, CellView } from "../types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right tabular-nums text-foreground">{children}</span>
    </div>
  );
}

/** Everything one call returned: the timings, the real cost, the evidence it was live, every field. */
export function CellDetail({
  battle,
  cell,
  revealed,
  onClose,
}: {
  battle: BattleView;
  cell: CellView | null;
  revealed: boolean;
  onClose: () => void;
}) {
  const lane = cell ? battle.lanes.find((l) => l.lane_id === cell.laneId) : undefined;
  const subject = cell ? battle.subjects.find((s) => s.subject_id === cell.subjectId) : undefined;
  const hidden = battle.blind && !revealed;
  return (
    <Dialog open={cell !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {cell && lane && (
          <>
            <DialogHeader>
              <DialogTitle>
                {laneName(battle, lane, revealed)} · {subject?.label ?? cell.subjectId}
              </DialogTitle>
              <DialogDescription>{statusLabel(cell.status)}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Row label="Round trip">{formatMs(cell.wallMs)}</Row>
                <Row label="Source time">{formatMs(cell.vendorMs)}</Row>
                {!hidden && <Row label="Vendor cost">{formatAdminUsd(cell.costUsd, { digits: "price" })}</Row>}
                {!hidden && <Row label="Member price">{formatPoints(cell.points)}</Row>}
                {!hidden && cell.providerSlug && <Row label="Served by">{cell.providerSlug}{cell.via ? ` · ${cell.via === "treg" ? "treg" : "direct"}` : ""}</Row>}
                {cell.ignoredFilters.length > 0 && (
                  <Row label="Ignored">{cell.ignoredFilters.map((f) => f.label || f.input).join(", ")}</Row>
                )}
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  {cell.evidence?.verified ? (
                    <Badge tone={cell.evidence.clean ? "success" : "destructive"} icon={cell.evidence.clean ? <Check /> : <X />}>
                      {cell.evidence.clean ? "Live call verified" : "Void"}
                    </Badge>
                  ) : (
                    <Badge tone="warning">Not verified</Badge>
                  )}
                  {cell.callId && <Badge>{cell.callId.slice(0, 8)}</Badge>}
                </div>
                {(cell.errorCode || (cell.evidence?.problems.length ?? 0) > 0) && (
                  <ErrorNotice
                    size="compact"
                    title={reasonLabel(cell) || "Did not count"}
                    message={[cell.errorMessage, ...(cell.evidence?.problems ?? [])].filter(Boolean).join(" · ")}
                    code={cell.errorCode ?? undefined}
                  />
                )}
              </div>
            </div>
            {cell.answerFields.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-sm font-semibold text-foreground">
                  Fields · {cell.answerFields.filter((f) => f.filled).length} of {cell.answerFields.length} filled
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {cell.answerFields.map((f) => (
                        <tr key={f.path} className="border-b border-border/60 last:border-0">
                          <td className="px-2 py-1 font-mono text-xs text-foreground">{f.path}</td>
                          <td className="px-2 py-1 text-xs text-muted-foreground">{f.filled ? f.type : "empty"}</td>
                          <td className="max-w-[16rem] truncate px-2 py-1 text-xs text-foreground">{f.sample ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {cell.output != null && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Answer</summary>
                <pre data-kind-source="explicit" className="mt-1 max-h-72 overflow-auto rounded-md bg-muted p-2 text-xs text-foreground">
                  {JSON.stringify(cell.output, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
