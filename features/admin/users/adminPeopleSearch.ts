"use client";

// Jump to a person from ⌘K (users one-roof lane C, 2026-10-17). The global command bar asks this,
// for platform admins only, once she has typed two characters: matches by email, name or id over
// THE shared admin roster (adminRoster.ts — the same one read the admin pages use, so the first
// question costs one roster read per tab and every later one costs nothing). Picking a hit opens
// the person's page (`userRecordHref`).

import { loadAdminRoster } from "./adminRoster";
import { usableLabel } from "./useAdminUserLabel";

export interface AdminPersonHit {
  id: string;
  label: string;
  email: string | null;
}

interface RosterPerson {
  id?: unknown;
  email?: unknown;
  display_name?: unknown;
  full_name?: unknown;
}

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Up to `limit` people matching every typed word (email, name or id), best first. */
export async function searchAdminPeople(query: string, limit = 6): Promise<AdminPersonHit[]> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const roster = await loadAdminRoster();
  const hits: Array<AdminPersonHit & { rank: number }> = [];
  for (const raw of roster.users as RosterPerson[]) {
    const id = text(raw.id);
    if (!id) continue;
    const email = text(raw.email);
    const name = text(raw.display_name) ?? text(raw.full_name);
    const hay = [email, name, id].filter(Boolean).join(" ").toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    const first = words[0] ?? "";
    // An email or name that STARTS with what she typed outranks one that only contains it.
    const rank = email?.toLowerCase().startsWith(first) || name?.toLowerCase().startsWith(first) ? 0 : id.startsWith(first) ? 1 : 2;
    hits.push({ id, email, label: usableLabel(name, email) ?? email ?? id, rank });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map(({ rank: _rank, ...hit }) => hit);
}
