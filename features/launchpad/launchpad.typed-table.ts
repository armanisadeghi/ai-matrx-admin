// features/launchpad/launchpad.typed-table.ts — THE LAUNCHPADS (project custom-experience §5.2; frozen contract
// features/shell/shell-layout/contract.ts).
//
// Organization scope, many rows: one per `slot` — `org:<key>` is the organization's own launchpad,
// `person:<uuid>:<key>` one person's. The whole `LaunchpadDoc` is JSON in `doc`. Every write is a record
// version in the store, so History previews and restores any version with no second store ("Set active").
// A person's launchpad is written in ONE home organization: the organization its row already lives in, else
// the organization new things are saved in; read across every organization, newest wins per key.
import { defineTypedTable, f } from "@ai-matrx/records/typed-table";
import {
  LAUNCHPAD_TABLE_SLUG,
  SHELL_LAYOUT_KEPT_FOR,
  type LaunchpadSlot,
} from "@/features/shell/shell-layout/contract";

export const launchpadTable = defineTypedTable({
  name: "Launchpad",
  slug: LAUNCHPAD_TABLE_SLUG,
  kept_for: SHELL_LAYOUT_KEPT_FOR,
  scope: "organization",
  key: "slot",
  fields: {
    slot: f.text({ label: "Slot", unique: true, required: true }),
    key: f.text({ label: "Key", required: true }),
    title: f.text({ label: "Title", required: true }),
    owner: f.text({ label: "Owner" }),
    doc: f.longText({ label: "Layout", required: true }),
    note: f.text({ label: "Note" }),
    saved_at: f.datetime({ label: "Saved" }),
  },
});

/** `org` = the organization's own launchpad; `person:<uuid>` = one person's. */
export type LaunchpadOwner = "org" | `person:${string}`;

export const personOwner = (userId: string): LaunchpadOwner => `person:${userId}`;

export function launchpadSlot(owner: LaunchpadOwner, key: string): LaunchpadSlot {
  return owner === "org" ? `org:${key}` : `${owner}:${key}`;
}

/** A launchpad key: lower-case words joined by dashes, 1–40 characters (it is the bookmarkable URL). */
export const LAUNCHPAD_KEY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** A key from a title ("Sales pipeline" → "sales-pipeline"), unique among `taken`. */
export function keyFromTitle(title: string, taken: readonly string[]): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "launchpad";
  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}-${n}`;
  return key;
}

/**
 * The launchpad rows a person sees, newest first, one per key and owner: their own (every organization;
 * newest wins per key) plus the `org` launchpads of `activeOrg`. Pure — the browser read
 * (`useLaunchpads`) and the server read (`server/readLaunchpads.ts`) pick with this one rule.
 */
export function visibleLaunchpadRows<R extends { key: string; owner?: string | null; saved_at?: string | null; _organizationId: string }>(
  rows: readonly R[],
  userId: string | null,
  activeOrg: string | null,
): R[] {
  const mineOwner = userId ? personOwner(userId) : null;
  const newestFirst = [...rows].sort((a, b) => (b.saved_at ?? "").localeCompare(a.saved_at ?? ""));
  const seen = new Set<string>();
  const picked: R[] = [];
  for (const r of newestFirst) {
    const isMine = mineOwner !== null && r.owner === mineOwner;
    const isOrg = r.owner === "org" && activeOrg !== null && r._organizationId === activeOrg;
    if (!isMine && !isOrg) continue;
    const id = `${isMine ? "p" : "o"}:${r.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    picked.push(r);
  }
  return picked;
}
