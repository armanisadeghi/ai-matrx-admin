"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Eye, EyeOff, Play, RotateCcw, Square } from "lucide-react";
import { EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { Swords } from "lucide-react";
import { RecordPageHeader, type RecordPageAction } from "@/features/shell/components/header/templates/RecordPageHeader";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { archiveBattle, cancelBattle, runBattle } from "../service";
import { isStalled, progressOf, shownLanes } from "../derive";
import { useBattleData, useNow } from "../useBattleData";
import type { BattleStatus } from "../types";
import { BypassStrip } from "./BypassStrip";
import { CoveragePanel } from "./CoveragePanel";
import { PromotePanel } from "./PromotePanel";
import { ResultGrid } from "./ResultGrid";

export const BATTLE_HOME = "/administration/tool-battle";

const STATUS: Record<BattleStatus, { label: string; tone: "neutral" | "info" | "success" | "warning" | "destructive" }> = {
  draft: { label: "Not run", tone: "neutral" },
  running: { label: "Running", tone: "info" },
  completed: { label: "Done", tone: "success" },
  failed: { label: "No answers", tone: "destructive" },
  cancelled: { label: "Canceled", tone: "warning" },
};

export function ToolBattlePage({ battleId }: { battleId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { read, reload } = useBattleData(battleId);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);
  const now = useNow(5000);

  // A runner that died leaves cells under a lapsed lease: ask the server to pick them up once.
  const stalled = read.state === "ready" && read.cells.some((c) => isStalled(c, now, read.battle.leaseSeconds));
  useEffect(() => {
    if (!stalled || resumed.current) return;
    resumed.current = true;
    void runBattle(dispatch, battleId, { scope: "unfinished" }).then((r) => {
      if (r.error) toast.error(r.error);
      reload();
    });
  }, [stalled, battleId, dispatch, reload]);

  if (read.state === "loading") {
    return (
      <>
        <RecordPageHeader backHref={BATTLE_HOME} parents={[{ label: "Tool Battle", href: BATTLE_HOME }]} record={{ name: "Battle", token: "tool_battle", id: battleId }} />
        <div className="px-[var(--matrx-page-gutter)] pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
          <RegionSkeleton shape="rows" count={5} aria-label="Loading the battle" />
        </div>
      </>
    );
  }
  if (read.state === "failed") return <ReadFailure what="battle" error={read.error} />;
  if (read.state === "missing") return <EmptyState icon={<Swords />} title="Battle not found" />;

  const { battle, cells } = read;
  const progress = progressOf(cells);
  const running = battle.status === "running" && progress.done < progress.total;
  const unfinished = cells.some((c) => c.status === "queued" || (c.status === "running" && isStalled(c, now, read.battle.leaseSeconds)));
  const lanes = shownLanes(battle, revealed);

  const act = async (fn: () => Promise<{ error: string | null }>, done?: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.error) toast.error(r.error);
    else if (done) toast.success(done);
    reload();
  };

  const actions: RecordPageAction[] = [];
  if (running) {
    actions.push({
      label: "Stop",
      icon: Square,
      destructive: true,
      disabled: busy,
      showLabel: true,
      onPress: () => void act(() => cancelBattle(dispatch, battleId), "Stopped"),
    });
  } else {
    actions.push({
      label: unfinished || battle.status === "draft" ? "Run" : "Run again",
      icon: unfinished || battle.status === "draft" ? Play : RotateCcw,
      primary: true,
      disabled: busy,
      showLabel: true,
      onPress: () =>
        void (async () => {
          if (!unfinished && battle.status !== "draft") {
            const ok = await confirm({
              title: "Run every lookup again?",
              description: `${progress.total} paid calls.`,
              confirmLabel: "Run again",
            });
            if (!ok) return;
          }
          await act(
            () => runBattle(dispatch, battleId, { scope: unfinished || battle.status === "draft" ? "unfinished" : "all" }),
          );
        })(),
    });
  }
  if (battle.blind) {
    actions.push({
      label: revealed ? "Hide names" : "Reveal",
      icon: revealed ? EyeOff : Eye,
      showLabel: true,
      onPress: () => setRevealed((r) => !r),
    });
  }
  actions.push({
    label: "Archive",
    icon: Archive,
    disabled: running,
    onPress: () =>
      void (async () => {
        const ok = await confirm({ title: "Archive this battle?", confirmLabel: "Archive", variant: "destructive" });
        if (!ok) return;
        await archiveBattle(battleId);
        router.push(BATTLE_HOME);
      })(),
  });

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <>
      <RecordPageHeader
        backHref={BATTLE_HOME}
        parents={[{ label: "Tool Battle", href: BATTLE_HOME }]}
        record={{ name: battle.blind && !revealed ? "Blind battle" : battle.title, token: "tool_battle", id: battleId }}
        status={STATUS[battle.status]}
        actions={actions}
      />
      <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto [&>*]:shrink-0 px-[var(--matrx-page-gutter)] pb-8 pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BypassStrip />
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span className="tabular-nums">
              {progress.done} of {progress.total} lookups
            </span>
            <span className="h-1.5 w-32 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
            </span>
          </div>
        </div>
        <ResultGrid battle={battle} cells={cells} lanes={lanes} revealed={revealed} />
        <CoveragePanel battle={battle} lanes={lanes} revealed={revealed} />
        {!(battle.blind && !revealed) && <PromotePanel key={battle.promotions.length + battle.status} battle={battle} onPromoted={reload} />}
      </div>
    </>
  );
}
