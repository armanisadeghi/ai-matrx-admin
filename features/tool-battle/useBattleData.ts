"use client";

import { useEffect, useState } from "react";
import { fetchBattle, fetchCells } from "./service";
import type { BattleView, CellView } from "./types";

/** While a battle runs the page re-reads its rows on this beat; the rows are the stream. */
export const LIVE_REREAD_MS = 2000;

export type BattleRead =
  | { state: "loading" }
  | { state: "failed"; error: unknown }
  | { state: "missing" }
  | { state: "ready"; battle: BattleView; cells: CellView[] };

export function useBattleData(battleId: string): { read: BattleRead; reload: () => void } {
  const [read, setRead] = useState<BattleRead>({ state: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchBattle(battleId), fetchCells(battleId)]).then(
      ([battle, cells]) => alive && setRead(battle ? { state: "ready", battle, cells } : { state: "missing" }),
      (error) => alive && setRead({ state: "failed", error }),
    );
    return () => {
      alive = false;
    };
  }, [battleId, tick]);

  const live =
    read.state === "ready" &&
    (read.battle.status === "running" || read.cells.some((c) => c.status === "queued" || c.status === "running"));
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), LIVE_REREAD_MS);
    return () => window.clearInterval(timer);
  }, [live]);

  return { read, reload: () => setTick((t) => t + 1) };
}

/** A clock that ticks, so lease checks never read `Date.now()` during render. */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}
