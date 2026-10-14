/**
 * Enrich: "Changes to your brand" — the diff between the run's final validated set and the brand's current
 * state (pure; ENRICH.md §4). Nothing here writes; apply.ts writes only what the person confirms.
 *
 *   add       — ours in the run, not on the brand (an account, a site, a fact, another name, a logo)
 *   replace   — a single slot (name, logo, description, industry, primary website) the run settled on a
 *               DIFFERENT value than the brand holds: old and new side by side, "Keep current" / "Use new"
 *   conflict  — the person said NO during the run to something on the brand now (an account, a website, the
 *               logo). Never an automatic removal: "Remove from brand" / "Keep it", default Keep it
 *   unchanged — everything else on the brand (collapsed to a count)
 */

import { collapseAliasedAccounts, isOurs, type Decision, type EvidenceItem } from "../evidence";
import type { KnownFact, KnownGroup } from "./known";

export type ChangeKind = "add" | "replace" | "conflict" | "unchanged";
/** apply = Use new / Add / Remove from brand; keep = Keep current / Skip / Keep it. */
export type ChangeChoice = "apply" | "keep";

export type SlotField = "name" | "logo" | "description" | "category" | "website";

export interface EnrichChange {
  id: string;
  kind: ChangeKind;
  group: KnownGroup;
  label: string;
  /** What is on the brand now (replace, conflict, unchanged). */
  current: KnownFact | null;
  /** What the run settled on (add, replace). */
  next: EvidenceItem | null;
  /** The decision the run carries for `next` (alias = another name). */
  nextDecision: Decision | null;
  /** The single slot a replacement fills. */
  slot: SlotField | null;
  /** The default choice: add / replace → apply; conflict → keep (never an automatic removal). */
  defaultChoice: ChangeChoice;
}

const SLOT_FIELDS: SlotField[] = ["name", "logo", "description", "category", "website"];
const SLOT_LABEL: Record<SlotField, string> = { name: "Name", logo: "Logo", description: "Description", category: "Industry", website: "Primary website" };
const ADDABLE = new Set(["website", "social", "logo", "phone", "email", "address", "name"]);
const GROUP_OF: Record<string, KnownGroup> = {
  name: "basics",
  logo: "basics",
  description: "basics",
  category: "basics",
  website: "websites",
  social: "accounts",
  phone: "facts",
  email: "facts",
  address: "facts",
};

/** A conflict can be taken back only where the retraction reaches: an account, a site, the logo. */
export function removable(f: KnownFact): boolean {
  return f.ref.type === "property" || f.ref.type === "site" || (f.ref.type === "brand" && f.ref.field === "logo");
}

function isSlotCurrent(f: KnownFact, slot: SlotField): boolean {
  if (!f.item) return false;
  if (slot === "website") return f.item.field === "website" && f.decision === "preferred";
  if (slot === "name") return f.item.field === "name" && f.decision === "preferred";
  return f.item.field === slot;
}

export function computeEnrichDiff(input: {
  known: KnownFact[];
  items: Map<string, EvidenceItem>;
  decisions: Record<string, Decision>;
  /** Images the screen could not load: never offered. */
  broken?: ReadonlySet<string>;
  /** The known facts that seeded the run (checked). One whose answer the person took back during the run
   *  (an image un-kept: logos have no "Not us" button) counts as a NO, exactly like "Not us". */
  seeded?: ReadonlySet<string>;
}): EnrichChange[] {
  const { known, items, decisions } = input;
  const seeded = input.seeded ?? new Set<string>();
  const saidNo = (f: KnownFact) => decisions[f.id] === "no" || (seeded.has(f.id) && Boolean(f.item) && !decisions[f.id]);
  const broken = input.broken ?? new Set<string>();
  const knownKeys = new Set(known.map((f) => f.id));
  const out: EnrichChange[] = [];
  const handled = new Set<string>();

  // Conflicts first: the person said NO to something on the brand now.
  for (const f of known) {
    if (saidNo(f) && removable(f)) {
      out.push({ id: `conflict:${f.id}`, kind: "conflict", group: f.group, label: f.label, current: f, next: null, nextDecision: null, slot: null, defaultChoice: "keep" });
      handled.add(f.id);
    }
  }

  // Single slots: the run's PREFERRED value against the brand's current one.
  const preferredOf = (field: string) =>
    [...items.values()].find((i) => i.field === field && decisions[i.key] === "preferred" && !broken.has(i.key)) ?? null;
  for (const slot of SLOT_FIELDS) {
    const next = preferredOf(slot);
    if (!next || knownKeys.has(next.key)) continue;
    const current = known.find((f) => isSlotCurrent(f, slot)) ?? null;
    handled.add(next.key);
    if (current && !handled.has(current.id)) {
      out.push({ id: `replace:${slot}`, kind: "replace", group: current.group, label: SLOT_LABEL[slot], current, next, nextDecision: "preferred", slot, defaultChoice: "apply" });
    } else {
      out.push({ id: `add:${next.key}`, kind: "add", group: GROUP_OF[slot] ?? "facts", label: SLOT_LABEL[slot], current: null, next, nextDecision: "preferred", slot, defaultChoice: "apply" });
    }
  }

  // Additions: everything else the run made ours that the brand does not hold.
  const ours = [...items.values()].filter(
    (i) => ADDABLE.has(i.field) && isOurs(decisions[i.key]) && !knownKeys.has(i.key) && !handled.has(i.key) && !broken.has(i.key),
  );
  // An account found under two addresses (`same_as`) is one account; one already on the brand is not new.
  const accounts = collapseAliasedAccounts(ours.filter((i) => i.field === "social")).filter((i) => !(i.same_as ?? []).some((k) => knownKeys.has(k)));
  for (const i of [...ours.filter((x) => x.field !== "social"), ...accounts]) {
    const d = decisions[i.key] ?? null;
    // A name is either THE name (a slot, above) or another name we go by.
    if (i.field === "name" && d !== "alias") continue;
    out.push({
      id: `add:${i.key}`,
      kind: "add",
      group: GROUP_OF[i.field] ?? "facts",
      label: i.field === "name" ? "Other name" : i.field === "logo" ? "Image" : i.field === "social" ? (i.platform ?? "Account") : i.field === "website" ? "Website" : i.field.charAt(0).toUpperCase() + i.field.slice(1),
      current: null,
      next: i,
      nextDecision: d,
      slot: null,
      defaultChoice: "apply",
    });
  }

  // Unchanged: every known fact not conflicted or replaced.
  const touched = new Set(out.filter((c) => c.current).map((c) => c.current?.id));
  for (const f of known) {
    if (touched.has(f.id)) continue;
    out.push({ id: `same:${f.id}`, kind: "unchanged", group: f.group, label: f.label, current: f, next: null, nextDecision: null, slot: null, defaultChoice: "keep" });
  }
  return out;
}

export function diffCounts(changes: EnrichChange[]): Record<ChangeKind, number> {
  const c: Record<ChangeKind, number> = { add: 0, replace: 0, conflict: 0, unchanged: 0 };
  for (const x of changes) c[x.kind] += 1;
  return c;
}
