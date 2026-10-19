"use client";

import type { ReactNode } from "react";

/**
 * The record's header row when the record is not the page (a board tile): the same `left` (its name
 * and kind) and `right` (Send email, Copy link, Log an activity, Move to trash…) the page hands
 * `RouteHeader`, drawn as a strip at the top of the record instead of in the shell's header.
 */
export function EmbeddedRecordHeader({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-10 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card/60 px-1 py-1">
      <div className="flex min-w-0 flex-1 items-center">{left}</div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-1">{right}</div> : null}
    </div>
  );
}
