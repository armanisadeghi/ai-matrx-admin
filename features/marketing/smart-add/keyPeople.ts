/**
 * Smart Add — the key-people step's answer (aidream mandate `brand_intake.key_people_finder`, workflow step
 * `key_people`, kind `brand_intake_key_people`). Off the critical path: the step runs at the end of a business
 * round once every deterministic people source is in, and its people land in the Key people section.
 *
 * A person whose profile is one of the round's staff accounts (a LinkedIn /in/ row) enriches that row (role and
 * title); everyone else becomes a row of their own, answered like a staff row (Yes = the key_person relationship).
 * Grounding (reason, evidence page, certainty) rides the row's source card, shown on hover only.
 */

import type { EvidenceItem } from "./evidence";

export interface KeyPerson {
  name: string;
  role: string;
  title_text: string | null;
  profile_urls: string[];
  evidence_urls: string[];
  certainty: "confirmed" | "likely" | "possible";
  reason: string;
}

const CERTAINTY = new Set(["confirmed", "likely", "possible"]);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function person(raw: unknown): KeyPerson | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  return {
    name,
    role: typeof r.role === "string" ? r.role : "other",
    title_text: typeof r.title_text === "string" && r.title_text.trim() ? r.title_text.trim() : null,
    profile_urls: strings(r.profile_urls),
    evidence_urls: strings(r.evidence_urls),
    certainty: (CERTAINTY.has(String(r.certainty)) ? r.certainty : "possible") as KeyPerson["certainty"],
    reason: typeof r.reason === "string" ? r.reason : "",
  };
}

function peopleOf(raw: unknown): KeyPerson[] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.people)) return null;
  return r.people.map(person).filter((p): p is KeyPerson => p !== null);
}

/** The step's people, from its output (`structured_output`, or a kind instance in `content`). Null until it answers. */
export function parseKeyPeople(raw: unknown): KeyPerson[] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const direct = peopleOf(r) ?? peopleOf(r.structured_output);
  if (direct) return direct;
  if (Array.isArray(r.content)) {
    for (const item of r.content) {
      const hit = peopleOf(item);
      if (hit) return hit;
    }
  }
  return null;
}

/** A profile address without scheme, www, query or trailing slash, lowercased (so two forms of one profile match). */
export function profileKey(url: string | null | undefined): string {
  return (url ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

const ORDER = { confirmed: 0, likely: 1, possible: 2 } as const;

/** "Senior Managing Partner" or the role ("Founder") when the source wrote no title. */
export function personTitle(p: KeyPerson): string {
  return p.title_text ?? (p.role && p.role !== "other" ? p.role[0].toUpperCase() + p.role.slice(1) : "");
}

/**
 * The agent's people against the round's staff accounts: the person each staff row IS (by profile address), and a
 * row item for every other person (key `key_person:<name>`), most certain first.
 */
export function keyPeopleRows(
  people: readonly KeyPerson[],
  staff: readonly EvidenceItem[],
): { byStaff: Map<string, KeyPerson>; extra: EvidenceItem[] } {
  const staffByProfile = new Map(staff.map((s) => [profileKey(s.url ?? s.value), s.key]));
  const byStaff = new Map<string, KeyPerson>();
  const extra: EvidenceItem[] = [];
  const seen = new Set<string>();
  for (const p of [...people].sort((a, b) => ORDER[a.certainty] - ORDER[b.certainty])) {
    const staffKey = p.profile_urls.map((u) => staffByProfile.get(profileKey(u))).find(Boolean);
    if (staffKey) {
      if (!byStaff.has(staffKey)) byStaff.set(staffKey, p);
      continue;
    }
    const key = `key_person:${p.name.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push({
      key,
      field: "name",
      value: p.name,
      label: p.name,
      image_url: null,
      url: p.profile_urls[0] ?? null,
      platform: null,
      handle: null,
      followers: null,
      verified: null,
      profile_id: null,
      source: { node: "key_people", kind: "website", url: p.evidence_urls[0] ?? null, where: "Key people read of the round" },
      confidence: p.certainty === "confirmed" ? 0.9 : p.certainty === "likely" ? 0.7 : 0.4,
      certainty: p.certainty === "confirmed" ? "certain" : p.certainty,
      certainty_reasons: p.reason ? [p.reason] : [],
    });
  }
  return { byStaff, extra };
}
