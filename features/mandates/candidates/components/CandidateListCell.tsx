"use client";

/**
 * THE CANDIDATES CELL on every mandate list (Mandate Candidates, PLAN §2.6;
 * Arman, 2026-09-28: "each one that comes in showing up as a count on the
 * mandate list and page"). One component for the platform-admin list and the
 * member / organization lists (V1 D4) — "2 of 3 in"; red when a pair failed or
 * came out worse; amber when stalled; empty when no candidate is open. It
 * re-reads itself on the heartbeat while collecting (V1 D3, `../live.ts`) and
 * opens the record's Candidates tab.
 */

import Link from "next/link";
import type { MandateCandidateCell } from "@/features/mandates/admin-list/rpc";
import { useLiveCandidateCell } from "../live";

/**
 * The cell's words. Failed pairs are named in the text, not only in the red
 * tint and the tooltip: "3 of 3 in" over three failures read as a healthy,
 * finished collection (verifier, 2026-10-10).
 */
export function candidateCellText(cell: MandateCandidateCell): string {
  const failed = cell.runs_failed ?? 0;
  const worse = cell.runs_regressed ?? 0;
  if (failed > 0 && failed >= cell.runs_in) return `${failed} of ${cell.runs_wanted} failed`;
  const count = `${cell.runs_in} of ${cell.runs_wanted} in`;
  const marks = [failed > 0 ? `${failed} failed` : null, worse > 0 ? `${worse} worse` : null].filter(Boolean);
  return marks.length ? `${count} · ${marks.join(" · ")}` : count;
}

export function CandidateListCell({
  mandateId,
  cell: listCell,
  href,
}: {
  mandateId: string | null;
  /** `undefined` = the list read did not carry candidates; `null` = none open. */
  cell: MandateCandidateCell | null | undefined;
  /** The record page; the cell adds `?tab=candidates`. */
  href: string;
}) {
  const cell = useLiveCandidateCell(mandateId, listCell);
  if (cell === undefined) {
    return (
      <span className="text-muted-foreground" title="The list read did not carry candidates.">
        —
      </span>
    );
  }
  if (!cell) return null;
  const bad = cell.runs_failed > 0 || cell.runs_regressed > 0;
  const title = bad
    ? `${cell.runs_failed} failed, ${cell.runs_regressed} worse than live.`
    : cell.stalled
      // read-gate-exempt: tooltip wording from the cell's own counters; nothing is read
      ? "No new run for a while."
      : cell.open_count > 1
        ? `${cell.open_count} candidates open; this is the one collecting.`
        : undefined;
  return (
    <Link
      href={`${href}${href.includes("?") ? "&" : "?"}tab=candidates`}
      data-testid="mandate-candidate-cell"
      onClick={(event) => event.stopPropagation()}
      title={title}
      className={
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums hover:underline " +
        (bad
          ? "bg-destructive/10 text-destructive-ink"
          : cell.stalled
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "bg-primary/10 text-primary-ink")
      }
    >
      {candidateCellText(cell)}
      {cell.open_count > 1 ? <span className="opacity-70">+{cell.open_count - 1}</span> : null}
    </Link>
  );
}
