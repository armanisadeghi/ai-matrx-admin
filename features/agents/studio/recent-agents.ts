/**
 * The start screen's "Recent" row: the person's own agents they can revise, newest edit first.
 * Pressing one opens "Improve an agent I have" on it, so only agents `canEditAgent` allows qualify.
 */

import { canEditAgent } from "./improve";

export interface RecentAgentLike {
  id: string;
  name: string | null;
  isArchived: boolean;
  isOwner: boolean | null;
  accessLevel: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export const RECENT_AGENTS_SHOWN = 6;

const stamp = (a: RecentAgentLike) => Date.parse(a.updatedAt ?? a.createdAt ?? "") || 0;

export function recentAgents<T extends RecentAgentLike>(agents: readonly T[], count = RECENT_AGENTS_SHOWN): T[] {
  return agents
    .filter((a) => !a.isArchived && canEditAgent(a) && Boolean(a.name?.trim()))
    .sort((a, b) => stamp(b) - stamp(a))
    .slice(0, count);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "Edited 3 days ago" — the line under a recent agent; null when the record carries no date. */
export function editedLine(agent: Pick<RecentAgentLike, "updatedAt" | "createdAt">, now = Date.now()): string | null {
  const at = Date.parse(agent.updatedAt ?? agent.createdAt ?? "");
  if (!at) return null;
  const ago = Math.max(0, now - at);
  const [unit, ms] = UNITS.find(([, size]) => ago >= size) ?? ["minute", 60_000];
  if (ago < 60_000) return "Edited just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return `Edited ${rtf.format(-Math.floor(ago / ms), unit)}`;
}
