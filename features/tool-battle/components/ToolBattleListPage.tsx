"use client";

import { useEffect, useState } from "react";
import { Plus, Swords } from "lucide-react";
import { Badge, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import AppLink from "@/components/navigation/AppLink";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { formatOf } from "../derive";
import { listBattles } from "../service";
import type { BattleView } from "../types";
import { BATTLE_HOME } from "./ToolBattlePage";

type Read = { state: "loading" } | { state: "failed"; error: unknown } | { state: "ready"; battles: BattleView[] };

const TONE = { draft: "neutral", running: "info", completed: "success", failed: "destructive", cancelled: "warning" } as const;
const LABEL = { draft: "Not run", running: "Running", completed: "Done", failed: "No answers", cancelled: "Cancelled" } as const;

export function ToolBattleListPage() {
  const [read, setRead] = useState<Read>({ state: "loading" });
  useEffect(() => {
    let alive = true;
    listBattles().then(
      (battles) => alive && setRead({ state: "ready", battles }),
      (error) => alive && setRead({ state: "failed", error }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <RecordPageHeader
        record={{ name: "Tool Battle" }}
        actions={[{ label: "New battle", icon: Plus, href: `${BATTLE_HOME}/new`, primary: true, showLabel: true }]}
      />
      <div className="h-full min-h-0 overflow-y-auto px-[var(--matrx-page-gutter)] pb-8 pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
        {read.state === "loading" && <RegionSkeleton shape="rows" count={5} aria-label="Loading battles" />}
        {read.state === "failed" && <ReadFailure what="battles" error={read.error} />}
        {read.state === "ready" && read.battles.length === 0 && (
          <EmptyState icon={<Swords />} title="No battles yet" />
        )}
        {read.state === "ready" && read.battles.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Battle</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Sources</th>
                  <th className="px-3 py-2 font-medium">Subjects</th>
                  <th className="px-3 py-2 font-medium">Best</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {read.battles.map((b) => {
                  const top = b.summary?.ranking[0];
                  const rollup = top ? b.summary?.lanes[top] : undefined;
                  return (
                    <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <AppLink href={`${BATTLE_HOME}/${b.id}`} className="font-medium text-foreground hover:underline">
                          {b.blind ? "Blind battle" : b.title}
                        </AppLink>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{b.jobKey}</td>
                      <td className="px-3 py-2 tabular-nums">{b.lanes.length}</td>
                      <td className="px-3 py-2 tabular-nums">{b.subjects.length}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {b.blind || !rollup || !top ? "—" : `${b.lanes.find((l) => l.lane_id === top)?.label ?? top} · ${formatOf(rollup.succeeded, rollup.cells)}`}
                      </td>
                      <td className="px-3 py-2"><Badge tone={TONE[b.status]}>{LABEL[b.status]}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatAbsoluteDate(b.startedAt ?? b.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
