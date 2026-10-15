import type { components } from "@ai-matrx/api/types";
import { checkPartyJournalistActivity, confirmPartyContactCandidate, derivePartyJournalistBeat, findPartyContacts, listPartyContactCandidates, readPartyJournalistBeat, rejectPartyContactCandidate, verifyPartyContactAddress } from "@ai-matrx/api/crm";
import { serverApi } from "@/lib/api/server-api";

/**
 * The enrichment doors (WP3). Every one is a thin call onto a server service
 * function — the same code path a scheduled sweep or a workflow node uses.
 *
 * The rule this whole surface exists to serve: **a candidate is never a
 * contact.** Nothing here makes anybody reachable except `confirmCandidate`,
 * which is the human act, and the server re-checks everything again at send
 * time regardless of what this UI does.
 */

export type ContactCandidateView =
  components["schemas"]["ContactCandidateView"];
export type WaterfallResult = components["schemas"]["WaterfallResult"];
export type FinalMileResult = components["schemas"]["FinalMileResult"];
export type ActivityVerdict = components["schemas"]["ActivityVerdict"];
export type BeatProfile = components["schemas"]["BeatProfile"];

const CANDIDATES = "/crm/parties/{party_id}/contacts";
const FIND = "/crm/parties/{party_id}/contacts/find";
const CONFIRM = "/crm/parties/{party_id}/contacts/{candidate_id}/confirm";
const REJECT = "/crm/parties/{party_id}/contacts/{candidate_id}/reject";
const VERIFY = "/crm/parties/{party_id}/contacts/verify";
/*
 * 🚨 Every WRITE below names the PARTY's organization (`organizationId`). A write
 * that relied on the selected organization refused with "Select an organization
 * before sending this request" whenever none was selected, and sent nothing: the
 * journalist card's "Check fit" did exactly that (2026-10-06). Same class as the
 * outreach single-send fix of 2026-09-28.
 */
const ACTIVITY = "/crm/parties/{party_id}/journalist-activity";
const BEAT = "/crm/parties/{party_id}/journalist-beat";

/** IC-3 — the ONE ranked list of ways to reach someone here. Writes nothing. */
export async function fetchContactCandidates(
  partyId: string,
  options?: { includeResolved?: boolean },
): Promise<ContactCandidateView[]> {
  const data = await listPartyContactCandidates(serverApi, { path: { party_id: partyId }, query: { include_resolved: Boolean(options?.includeResolved) } });
  return data;
}

/** Run the waterfall. Produces candidates only — never a contact. */
export async function findContacts(
  partyId: string,
  organizationId: string,
  input?: { personName?: string; usePaidProviders?: boolean },
): Promise<WaterfallResult> {
  const data = await findPartyContacts(serverApi, { path: { party_id: partyId }, body: {
    person_name: input?.personName ?? null,
    use_paid_providers: input?.usePaidProviders ?? true,
  } }, { organizationId: organizationId });
  return data;
}

/**
 * The human act. The two second-confirmations are NAMED, never a force flag:
 * a shared inbox is not proof of a personal mailbox, and an unverified address
 * is a bounce risk against the user's own sending domain.
 */
export async function confirmCandidate(
  partyId: string,
  organizationId: string,
  candidateId: string,
  input: { acceptRoleAddress: boolean; acceptUnverified: boolean },
): Promise<ContactCandidateView> {
  const data = await confirmPartyContactCandidate(serverApi, { path: { party_id: partyId, candidate_id: candidateId }, body: {
      accept_role_address: input.acceptRoleAddress,
      accept_unverified: input.acceptUnverified,
    } }, { organizationId: organizationId });
  return data;
}

/** Refuse a candidate. The verdict survives every later re-discovery. */
export async function rejectCandidate(
  partyId: string,
  organizationId: string,
  candidateId: string,
  reason?: string,
): Promise<ContactCandidateView> {
  const data = await rejectPartyContactCandidate(serverApi, { path: { party_id: partyId, candidate_id: candidateId }, body: { reason: reason ?? null } }, { organizationId: organizationId });
  return data;
}

/** Free syntax/MX/disposable filter, then the paid final mile if it passed. */
export async function verifyAddress(
  partyId: string,
  organizationId: string,
  mediumId: string,
): Promise<FinalMileResult> {
  const data = await verifyPartyContactAddress(serverApi, { path: { party_id: partyId }, body: {
    medium_id: mediumId,
    force: false,
  } }, { organizationId: organizationId });
  return data;
}

/** Is this person still publishing where we think they are? (D10 / ListIQ.) */
export async function checkJournalistActivity(
  partyId: string,
  organizationId: string,
  input?: { windowDays?: number; useSearch?: boolean },
): Promise<ActivityVerdict> {
  const data = await checkPartyJournalistActivity(serverApi, { path: { party_id: partyId }, body: {
    // Omitted = the organization's `pr.beat_recency_days` knob (E9, default 90).
    ...(input?.windowDays ? { window_days: input.windowDays } : {}),
    use_search: input?.useSearch ?? true,
  } }, { organizationId: organizationId });
  return data;
}

/** The stored beat profile. Never re-derives, never spends. */
export async function fetchJournalistBeat(
  partyId: string,
): Promise<BeatProfile | null> {
  const data = await readPartyJournalistBeat(serverApi, { path: { party_id: partyId } });
  return data ?? null;
}

/** Work out what they cover, from pages we already crawled. */
export async function deriveJournalistBeat(
  partyId: string,
  organizationId: string,
  pitch?: string,
): Promise<BeatProfile> {
  // The server's field is `pitch` (aidream 90ea9a2874 renamed it from
  // campaign_context; the old name is only an input alias).
  const data = await derivePartyJournalistBeat(serverApi, { path: { party_id: partyId }, body: {
    pitch: pitch?.trim() ? pitch.trim() : null,
  } }, { organizationId: organizationId });
  return data;
}
