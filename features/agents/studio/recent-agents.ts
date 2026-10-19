/**
 * The start screen's "Recent" row: the person's own agents they can revise, newest edit first.
 * Pressing one opens "Improve an agent I have" on it, so only agents `canEditAgent` allows qualify.
 */

import { formatRelativeTime } from "@ai-matrx/kit/format";
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
  const seen = new Set<string>();
  return agents
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .filter((a) => !a.isArchived && canEditAgent(a) && Boolean(a.name?.trim()))
    .sort((a, b) => stamp(b) - stamp(a))
    .slice(0, count);
}

/** "Edited 3 days ago" — the line under a recent agent; null when the record carries no date. */
export function editedLine(agent: Pick<RecentAgentLike, "updatedAt" | "createdAt">, now = Date.now()): string | null {
  const at = agent.updatedAt ?? agent.createdAt;
  if (!at || !Date.parse(at)) return null;
  return `Edited ${formatRelativeTime(at, { style: "intl", now })}`;
}

/**
 * The line under each recent agent. Two different agents with the same name (a copy, a rebuild) get
 * the day each was made, so two identical rows never sit side by side.
 */
export function recentLines<T extends RecentAgentLike>(agents: readonly T[], now = Date.now()): Map<string, string | undefined> {
  const counts = new Map<string, number>();
  for (const a of agents) counts.set((a.name ?? "").trim().toLowerCase(), (counts.get((a.name ?? "").trim().toLowerCase()) ?? 0) + 1);
  const out = new Map<string, string | undefined>();
  for (const a of agents) {
    const edited = editedLine(a, now) ?? undefined;
    const duplicate = (counts.get((a.name ?? "").trim().toLowerCase()) ?? 0) > 1;
    const made = a.createdAt && Date.parse(a.createdAt) ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
    out.set(a.id, duplicate && made ? [edited, `made ${made}`].filter(Boolean).join(" · ") : edited);
  }
  return out;
}
