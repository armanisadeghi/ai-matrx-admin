// features/spaces/page/time.ts — Notion's "Edited 37m ago" wording: relative for a day, then the date.

import { formatRelativeTime } from "@ai-matrx/kit/format";

const NOTION = { minUnit: "minute", absoluteAfter: 86_400_000, absolute: "monthDay" } as const;

/** A page nobody changed after it was made (an install writes its pages a moment after making them). */
const UNTOUCHED_MS = 120_000;

export function editedAgo(iso: string, now = Date.now(), createdIso?: string): string {
  if (createdIso && Date.parse(iso) - Date.parse(createdIso) < UNTOUCHED_MS) return `Created ${formatRelativeTime(createdIso, { ...NOTION, now })}`;
  return `Edited ${formatRelativeTime(iso, { ...NOTION, now })}`;
}

/** A comment's time, as Notion writes it beside the author: "Just now", "5m", "3h", "Oct 4". */
export function commentAgo(iso: string, now = Date.now()): string {
  const stamp = formatRelativeTime(iso, { ...NOTION, suffix: false, now });
  return stamp === "now" ? "Just now" : stamp;
}
