/**
 * THE best-address rule (D223): which contact point an outreach-list member is
 * bound to. Pure. The server door (aidream
 * `aidream/services/crm/outreach_members.py` `pick_best`) applies the same rule,
 * and both run every case in aidream's
 * `aidream/services/crm/tests/best_contact_point_cases.json` — change both or
 * neither.
 *
 * Usable: channel email/phone, not opted out, `valid_to` not before today.
 * Rank: the list kind's channel (call → phone, else email), primary, higher
 * confidence, lower sort_order, then id — never the order rows came back in.
 */

export const BEST_CONTACT_POINT_CHANNELS = ["email", "phone"] as const;

export interface BestContactPointCandidate {
  id: string;
  party_id: string;
  channel: string | null;
  is_primary: boolean | null;
  opt_out_at?: string | null;
  valid_to?: string | null;
  confidence?: number | null;
  sort_order?: number | null;
}

export const BEST_CONTACT_POINT_COLUMNS =
  "id, party_id, channel, is_primary, opt_out_at, valid_to, confidence, sort_order";

export function preferredChannel(listKind: string | null | undefined): string {
  return listKind === "call" ? "phone" : "email";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function usable(p: BestContactPointCandidate, today: string): boolean {
  if (
    !p.channel ||
    !(BEST_CONTACT_POINT_CHANNELS as readonly string[]).includes(p.channel)
  ) {
    return false;
  }
  if (p.opt_out_at) return false;
  return !(p.valid_to && p.valid_to.slice(0, 10) < today);
}

type Rank = [number, number, number, number, string];

function rank(p: BestContactPointCandidate, preferred: string): Rank {
  return [
    p.channel === preferred ? 0 : 1,
    p.is_primary ? 0 : 1,
    p.confidence != null ? -p.confidence : 1,
    p.sort_order != null ? p.sort_order : 2 ** 31,
    p.id,
  ];
}

function lessThan(a: Rank, b: Rank): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

/** `party_id → contact_point_id`. A party with no usable address is absent. */
export function pickBestContactPoints(
  points: readonly BestContactPointCandidate[],
  listKind: string | null | undefined,
  today: string = todayIso(),
): Map<string, string> {
  const preferred = preferredChannel(listKind);
  const best = new Map<string, { rank: Rank; id: string }>();
  for (const p of points) {
    if (!usable(p, today)) continue;
    const r = rank(p, preferred);
    const current = best.get(p.party_id);
    if (!current || lessThan(r, current.rank)) {
      best.set(p.party_id, { rank: r, id: p.id });
    }
  }
  return new Map(Array.from(best, ([party, v]) => [party, v.id]));
}
