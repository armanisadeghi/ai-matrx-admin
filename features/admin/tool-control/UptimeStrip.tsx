"use client";

import { stripCells } from "./words";
import type { StripRow } from "./types";

const CELL_CLASS = {
  ok: "bg-success",
  some: "bg-warning",
  bad: "bg-destructive",
  none: "bg-muted",
} as const;

/** The last 48 hours, one cell per hour: green answered, amber some failed, red mostly failed, gray quiet. */
export function UptimeStrip({ rows }: { rows: readonly StripRow[] }) {
  const cells = stripCells(rows);
  return (
    <div className="flex h-5 items-end gap-px" role="img" aria-label="Last 48 hours of calls">
      {cells.map((cell) => (
        <span key={cell.start} title={`${new Date(cell.start).toLocaleString()} · ${cell.title}`} className={`h-full w-1 rounded-sm ${CELL_CLASS[cell.kind]}`} />
      ))}
    </div>
  );
}
