"use client";

/**
 * 🚨 "RENDERED" MEANS IT DREW, NOT THAT IT RESOLVED (2026-10-15 review B0).
 *
 * The Preview verdict read "This shape's own component rendered." at 1.8s on
 * /administration/utilities/kind-registry/brand_basics while the sandbox frame
 * was BLOCKED — and kept saying it after the frame itself showed "This view did
 * not load." The verdict was derived from what the ROUTE answered (a component
 * resolved), never from what reached the screen.
 *
 * This is the one channel a drawing surface uses to say what actually
 * happened. Every mount that can draw a shape's component reports here:
 *  - the sandbox frame: `waiting` until the frame measures its drawn content,
 *    `drew` then, `failed` when the frame never answers or the body throws;
 *  - the in-page compile: `drew` once the component committed inside its error
 *    boundary, `failed` when the boundary caught;
 *  - the html flavor: `waiting` until its document loads;
 *  - the body/library wait: `waiting`; a compile that fell to the generic
 *    floor: `failed`.
 *
 * A verdict host (`useKindDrawCollector`) wraps the render and reads the
 * combined answer. Outside a host the hooks are free no-ops, so chat, panels
 * and every other surface pay nothing.
 */

import React, { createContext, useContext, useEffect, useId, useState } from "react";

export type KindDrawState = "waiting" | "drew" | "failed";

type DrawReporter = (reporterId: string, state: KindDrawState | null) => void;

const KindDrawReportContext = createContext<DrawReporter | null>(null);

/** Report what this mount drew; withdraws its report when it unmounts. */
export function useReportKindDraw(state: KindDrawState): void {
  const report = useContext(KindDrawReportContext);
  const id = useId();
  useEffect(() => {
    report?.(id, state);
  }, [report, id, state]);
  useEffect(() => {
    return () => report?.(id, null);
  }, [report, id]);
}

/** The same report as an element — for a branch that returns JSX directly. */
export function ReportKindDraw({ state }: { state: KindDrawState }): null {
  useReportKindDraw(state);
  return null;
}

/**
 * What the screen shows, combined over every reporter:
 *  - "none"    — no reporter mounted (an in-page built-in, or nothing yet);
 *  - "failed"  — any reporter failed;
 *  - "drew"    — every reporter drew;
 *  - "waiting" — otherwise.
 */
export type CombinedDrawState = KindDrawState | "none";

export function combineDrawStates(states: readonly KindDrawState[]): CombinedDrawState {
  if (states.length === 0) return "none";
  if (states.includes("failed")) return "failed";
  if (states.every((s) => s === "drew")) return "drew";
  return "waiting";
}

/**
 * A verdict host's half: wrap the render in `<KindDrawReportHost report>` and
 * read `state`.
 *
 * "none" is only an answer AFTER the first commit — child report effects run
 * before this host's own effect, and both updates land in the same re-render,
 * so a frame that is about to report never reads as "nothing to wait for".
 * After the commit, "none" means the component drew in the page itself
 * (bundled components render synchronously), so it reads as "drew".
 */
const FIRST_COMMIT = "\u0000first-commit";

export function useKindDrawCollector(): {
  report: DrawReporter;
  state: KindDrawState;
} {
  // The host holds its own "waiting" until its first commit, so the first
  // paint can never read "nobody reported" as "it drew".
  const [states, setStates] = useState<Record<string, KindDrawState>>({
    [FIRST_COMMIT]: "waiting",
  });
  const [report] = useState<DrawReporter>(() => (reporterId: string, state: KindDrawState | null) => {
    setStates((prev) => {
      if (state === null) {
        if (!(reporterId in prev)) return prev;
        const next = { ...prev };
        delete next[reporterId];
        return next;
      }
      if (prev[reporterId] === state) return prev;
      return { ...prev, [reporterId]: state };
    });
  });
  useEffect(() => {
    report(FIRST_COMMIT, null);
  }, [report]);
  const combined = combineDrawStates(Object.values(states));
  const state: KindDrawState = combined === "none" ? "drew" : combined;
  return { report, state };
}

/** The verdict host's wrapper: every drawing mount inside reports to `report`. */
export function KindDrawReportHost({
  report,
  children,
}: {
  report: DrawReporter;
  children: React.ReactNode;
}) {
  return <KindDrawReportContext.Provider value={report}>{children}</KindDrawReportContext.Provider>;
}
