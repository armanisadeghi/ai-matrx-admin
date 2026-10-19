/**
 * The pure half of the board's Office items (`office-items.tsx`): a Workbook and a Presentation.
 * Each is `{ kind: "entity", entity: "<key>", id }` — a reference to the record, never a copy;
 * `id` is null until the person presses Create in the tile.
 */

import type { NodeSource } from "../board/document";
import type { FoundRecord } from "./types";

export const WORKBOOK_ITEM_KEY = "workbook";
export const PRESENTATION_ITEM_KEY = "presentation";

export const NEW_WORKBOOK_NAME = "Untitled workbook";
export const NEW_PRESENTATION_NAME = "Untitled presentation";

export function officeSource(key: string, id: string | null): NodeSource {
  return { kind: "entity", entity: key, id };
}

export function officeIdOf(key: string, source: NodeSource): string | null {
  return source.kind === "entity" && source.entity === key ? source.id : null;
}

export const workbookHref = (id: string) => `/workbooks/${id}`;
export const presentationHref = (id: string) => `/presentations/${id}`;

/** Every word of the query appears in the name (case-insensitive). An empty query matches all. */
function nameMatches(query: string, name: string): boolean {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const hay = name.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * The agent's door to the person's existing files of one Office kind: the same list the bring-in
 * picker reads (every organization they can reach, never the active one), matched on the name,
 * newest first.
 */
export async function findOfficeFiles(
  key: string,
  query: string,
  limit: number,
  read: () => Promise<readonly { id: string; name: string; description?: string | null; updated_at: string | null }[]>,
): Promise<FoundRecord[]> {
  const rows = await read();
  return rows
    .filter((r) => nameMatches(query, r.name))
    .map((r) => ({ type: key, id: r.id, title: r.name, updated_at: r.updated_at, ...(r.description ? { snippet: r.description } : {}) }))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, limit);
}
