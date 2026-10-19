/**
 * The pure half of the board's platform items (`platform-items.tsx`): Schedule, Knowledge source,
 * Visual map, Report and Sandbox. Each is `{ kind: "entity", entity: "<key>", id }` — a reference to
 * the record, never a copy; `id` is null until the person presses Create in the tile (a report has no
 * "new": its id is the report's slug).
 */

import type { NodeSource } from "../board/document";
import type { FoundRecord, ItemBasicValues, ItemStatus } from "./types";

export const SCHEDULE_ITEM_KEY = "schedule";
export const KNOWLEDGE_SOURCE_ITEM_KEY = "knowledge-source";
export const MAP_ITEM_KEY = "visual-map";
export const REPORT_ITEM_KEY = "report";
export const SANDBOX_ITEM_KEY = "sandbox";

export const NEW_SCHEDULE_NAME = "New schedule";
export const NEW_KNOWLEDGE_SOURCE_NAME = "New knowledge source";
export const NEW_MAP_NAME = "New map";

export function platformSource(key: string, id: string | null): NodeSource {
  return { kind: "entity", entity: key, id };
}

export function platformIdOf(key: string, source: NodeSource): string | null {
  return source.kind === "entity" && source.entity === key ? source.id : null;
}

export const scheduleHref = (id: string) => `/schedules/${id}`;
export const knowledgeSourceHref = (id: string) => `/knowledge/data-stores?store_id=${id}`;
export const mapRecordHref = (id: string) => `/maps/${id}`;
export const reportHref = (slug: string) => `/reports/${slug}`;
export const sandboxHref = (id: string) => `/sandbox/${id}`;

/** Every word of the query appears in the text (case-insensitive). An empty query matches all. */
export function textMatches(query: string, text: string): boolean {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const hay = text.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * The agent's door to the person's existing records of one platform kind: the same list the
 * bring-in picker reads, matched on the name and a second line, newest first.
 */
export async function findPlatformRecords(
  key: string,
  query: string,
  limit: number,
  read: () => Promise<readonly { id: string; name: string; detail?: string | null; updated_at: string | null }[]>,
): Promise<FoundRecord[]> {
  const rows = await read();
  return rows
    .filter((r) => textMatches(query, `${r.name} ${r.detail ?? ""}`))
    .map((r) => ({ type: key, id: r.id, title: r.name, updated_at: r.updated_at, ...(r.detail ? { snippet: r.detail } : {}) }))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, limit);
}

function basicText(basics: ItemBasicValues | null | undefined, key: string): string | undefined {
  const v = basics?.[key];
  return typeof v === "string" && v ? v : undefined;
}

/** A schedule's state on its tile: armed, paused, or stopped by the repeat guard. */
export function scheduleStatusOf(
  live: { enabled: boolean; suspended: boolean } | null,
  basics: ItemBasicValues | null | undefined,
): ItemStatus | null {
  if (live) {
    if (live.suspended && !live.enabled) return { tone: "attention", label: "Stopped" };
    return live.enabled ? { tone: "active", label: "On" } : { tone: "neutral", label: "Paused" };
  }
  const saved = basics?.["schedule_enabled"];
  if (typeof saved === "boolean") return saved ? { tone: "active", label: "On" } : { tone: "neutral", label: "Paused" };
  return null;
}

/** A sandbox's state: running, starting, stopped or failed — the instance's own status word. */
export function sandboxStatusOf(status: string | null | undefined, basics: ItemBasicValues | null | undefined): ItemStatus | null {
  const raw = status ?? basicText(basics, "sandbox_status");
  if (!raw) return null;
  const word = raw.toLowerCase();
  if (word === "running" || word === "ready") return { tone: "active", label: "Running" };
  if (word === "starting" || word === "creating" || word === "pending") return { tone: "attention", label: "Starting" };
  if (word === "failed" || word === "error") return { tone: "danger", label: "Failed" };
  if (word === "stopped" || word === "expired" || word === "terminated") return { tone: "neutral", label: "Stopped" };
  return { tone: "neutral", label: raw.charAt(0).toUpperCase() + raw.slice(1) };
}
