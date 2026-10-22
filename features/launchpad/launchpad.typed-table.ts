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

/** `org` = the organization's own launchpad (every member sees it); `person:<uuid>` = one person's. */
export type LaunchpadPadOwner = "org" | `person:${string}`;
/** A launchpad saved as a template: the organization's (`template:org`) or one person's (`template:person:<uuid>`). */
export type LaunchpadTemplateOwner = "template:org" | `template:person:${string}`;
export type LaunchpadOwner = LaunchpadPadOwner | LaunchpadTemplateOwner;

export const personOwner = (userId: string): LaunchpadPadOwner => `person:${userId}`;

/** Where a launchpad saved as a template goes: the organization's templates, or the person's own. */
export const templateOwner = (owner: LaunchpadPadOwner): LaunchpadTemplateOwner => `template:${owner}`;

/** The organization owns it (its launchpad or its template): only an owner or admin changes it. */
export const isOrganizationOwned = (owner: string | null | undefined): boolean => owner === "org" || owner === "template:org";

export function launchpadSlot(owner: LaunchpadOwner, key: string): LaunchpadSlot {
  return `${owner}:${key}` as LaunchpadSlot;
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
 * The launchpad rows a person sees, newest first: their own (every organization; newest wins per key) plus the
 * `org` launchpads of EVERY organization they read (the active organization is never a list filter; one per
 * organization and key). `activeOrg` only decides which organization's launchpad a shared key opens
 * (`useLaunchpads().byKey`). Pure — the browser read (`useLaunchpads`) and the server read
 * (`server/readLaunchpads.ts`, `{ organizations: false }`: its own only) pick with this one rule. Template rows
 * are never launchpads.
 */
export function visibleLaunchpadRows<R extends { key: string; owner?: string | null; saved_at?: string | null; _organizationId: string }>(
  rows: readonly R[],
  userId: string | null,
  _activeOrg: string | null,
  options: { organizations?: boolean } = {},
): R[] {
  if (!userId) return [];
  const mineOwner = personOwner(userId);
  const withOrganizations = options.organizations ?? true;
  return pickNewest(rows, (r) => {
    if (r.owner === mineOwner) return `p:${r.key}`;
    if (withOrganizations && r.owner === "org") return `o:${r._organizationId}:${r.key}`;
    return null;
  });
}

/**
 * The launchpads saved as templates that a person sees, newest first: their own (every organization; newest wins
 * per key) and every organization's they read (one per organization and key). The template gallery lists these
 * beside the role templates.
 */
export function visibleTemplateRows<R extends { key: string; owner?: string | null; saved_at?: string | null; _organizationId: string }>(
  rows: readonly R[],
  userId: string | null,
): R[] {
  const mine = userId ? templateOwner(personOwner(userId)) : null;
  return pickNewest(rows, (r) => {
    if (mine !== null && r.owner === mine) return `p:${r.key}`;
    if (r.owner === "template:org") return `o:${r._organizationId}:${r.key}`;
    return null;
  });
}

/** Rows newest first, one per identity (`null` = not shown). */
function pickNewest<R extends { saved_at?: string | null }>(rows: readonly R[], identity: (r: R) => string | null): R[] {
  const newestFirst = [...rows].sort((a, b) => (b.saved_at ?? "").localeCompare(a.saved_at ?? ""));
  const seen = new Set<string>();
  const picked: R[] = [];
  for (const r of newestFirst) {
    const id = identity(r);
    if (id === null || seen.has(id)) continue;
    seen.add(id);
    picked.push(r);
  }
  return picked;
}
