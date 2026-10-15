// features/crm/sending-identities/service.ts
//
// Contract-bound client for aidream's `/sending-identities/*` surface.
//
// WHY THIS ONE CRM SUB-FEATURE TALKS TO PYTHON INSTEAD OF SUPABASE:
// the rest of `features/crm/` reads and writes `crm.*` straight from the
// browser, which is correct for plain CRUD. A sending identity is not plain
// CRUD — every meaningful operation is server-side work the browser physically
// cannot do: resolving DNS to prove domain ownership, reading SPF/DKIM/DMARC,
// operating an OAuth mailbox credential that must never reach a client, and
// running the gate that decides whether anything may be sent at all. There is
// still ONE canonical path per operation; it just lives in Python.
//
// Deliberately absent: any "send" call. Sending goes through the server's own
// gate (`send_through_identity`), never an endpoint a client can aim.

import {
  DEFAULT_PURPOSE_FILTER,
  PROMOTE_NEEDS_CONNECTION,
  type SendingPurposeFilter,
} from "./purpose";
import type {
  BringUpReadiness,
  CheckReport,
  ConnectableMailbox,
  SendingEventRecord,
  SendingIdentityDetail,
  SendingIdentityView,
  SendingPolicyView,
} from "./types";
import { checkAuthentication as checkAuthenticationOp, checkDomain as checkDomainOp, createSendingIdentity as createSendingIdentityOp, disableSendingIdentity, getBringUpReadiness as getBringUpReadinessOp, getSendingIdentity as getSendingIdentityOp, getSendingPolicy as getSendingPolicyOp, listConnectable, listSendingEvents as listSendingEventsOp, listSendingIdentities as listSendingIdentitiesOp, pauseSendingIdentity as pauseSendingIdentityOp, refreshIdentityHealth as refreshIdentityHealthOp, resumeSendingIdentity as resumeSendingIdentityOp, setSendingPolicy as setSendingPolicyOp, startIdentityWarmup, updateSendingIdentity as updateSendingIdentityOp } from "@ai-matrx/api/crm";
import { serverApi } from "@/lib/api/server-api";

const IDENTITY_PATH = "/sending-identities/{identity_id}";

/**
 * The organization's sending mailboxes of ONE purpose.
 *
 * 🚨 `purpose` IS ALWAYS SENT (default `outreach`). The route defaults to
 * outreach too, but the page's whole meaning depends on it: a `correspondence`
 * row — the mailbox a reviewed 1:1 send registers for audit — listed here reads
 * as an outreach mailbox stuck in setup behind a DNS record nobody can publish
 * (VERIFY-B1-B2-R5 W1). The audit rows are reachable by asking for them BY NAME,
 * so nothing is hidden.
 *
 * The answer is complete for that purpose in one response — this is aidream's
 * route, not a PostgREST `.select()`, so there is no 1000-row cap to guard with
 * `readAllRows`.
 */
export async function listSendingIdentities(
  organizationId?: string,
  purpose: SendingPurposeFilter = DEFAULT_PURPOSE_FILTER,
): Promise<SendingIdentityView[]> {
  const data = await listSendingIdentitiesOp(serverApi, { query: {
      purpose,
      ...(organizationId ? { organization_id: organizationId } : {}),
    } });
  return data;
}

/**
 * `organizationId` — the mailbox's OWN organization, when the caller has read
 * it off the row. Reading one record never depends on which organization is
 * selected; the transport still sends an organization, so the record's own is
 * the honest one to send.
 */
export async function getSendingIdentity(
  id: string,
  opts: { organizationId?: string } = {},
): Promise<SendingIdentityDetail> {
  const data = await getSendingIdentityOp(serverApi, { path: { identity_id: id } }, { organizationId: opts.organizationId });
  return data;
}

/**
 * Mailboxes the user could connect — INCLUDING the ones they cannot, each with
 * its reason. A mailbox that silently vanishes from a picker is a dead end.
 */
export async function listConnectableMailboxes(
  organizationId?: string,
): Promise<ConnectableMailbox[]> {
  const data = await listConnectable(serverApi, { query: organizationId ? { organization_id: organizationId } : undefined });
  return data;
}

export async function createSendingIdentity(body: {
  connection_id: string;
  from_address: string;
  from_name?: string | null;
  display_name?: string | null;
  organization_id?: string | null;
}): Promise<SendingIdentityDetail> {
  const data = await createSendingIdentityOp(serverApi, { body: {
    provider: "google_workspace",
    ...body,
  } });
  return data;
}

/**
 * PROMOTE A CORRESPONDENCE MAILBOX TO A CAMPAIGN MAILBOX — the promotion the
 * server already allows, given a door.
 *
 * `register_identity` is that door: its correspondence branch flips `purpose` to
 * `outreach` IN PLACE, keeping every `crm.sending_event` the mailbox already
 * wrote for its reviewed 1:1 sends, and refuses nothing (aidream
 * `sending_identity/service.py`, the promotion branch). There is no separate
 * promote endpoint, and inventing a second path to the same state is how two
 * surfaces come to disagree.
 *
 * The connection is read off the DETAIL because the list view does not carry it,
 * and a row whose Google account is gone gets a sentence, never a dead button
 * (`PROMOTE_NEEDS_CONNECTION` in `./purpose.ts`).
 */
export async function promoteToOutreachMailbox(
  identityId: string,
): Promise<SendingIdentityDetail> {
  const detail = await getSendingIdentity(identityId);
  if (!detail.connection_id) {
    throw new Error(PROMOTE_NEEDS_CONNECTION);
  }
  return createSendingIdentity({
    connection_id: detail.connection_id,
    from_address: detail.from_address,
    from_name: detail.from_name,
    display_name: detail.display_name,
    organization_id: detail.organization_id,
  });
}

export async function updateSendingIdentity(
  id: string,
  patch: Record<string, unknown>,
): Promise<SendingIdentityDetail> {
  const data = await updateSendingIdentityOp(serverApi, { path: { identity_id: id }, body: patch });
  return data;
}

/** Resolve the DNS TXT challenge. The only path to a verified domain. */
export async function checkDomain(id: string): Promise<CheckReport> {
  const data = await checkDomainOp(serverApi, { path: {
      identity_id: id,
    } });
  return data;
}

/** Measure SPF, DKIM and DMARC against live DNS. */
export async function checkAuthentication(id: string): Promise<CheckReport> {
  const data = await checkAuthenticationOp(serverApi, { path: {
      identity_id: id,
    } });
  return data;
}

export async function startWarmup(id: string): Promise<SendingIdentityDetail> {
  const data = await startIdentityWarmup(serverApi, { path: {
      identity_id: id,
    } });
  return data;
}

export async function pauseSendingIdentity(
  id: string,
  reason: string,
): Promise<SendingIdentityDetail> {
  const data = await pauseSendingIdentityOp(serverApi, { path: { identity_id: id }, body: { reason } });
  return data;
}

/**
 * Lift a pause. The system never calls this — when the breaker pauses an
 * identity, a person has to look at the health and decide.
 */
export async function resumeSendingIdentity(
  id: string,
): Promise<SendingIdentityDetail> {
  const data = await resumeSendingIdentityOp(serverApi, { path: { identity_id: id }, body: {} });
  return data;
}

export async function refreshIdentityHealth(
  id: string,
): Promise<SendingIdentityDetail> {
  const data = await refreshIdentityHealthOp(serverApi, { path: {
      identity_id: id,
    } });
  return data;
}

export async function listSendingEvents(
  id: string,
  limit = 100,
  opts: { organizationId?: string } = {},
): Promise<SendingEventRecord[]> {
  const data = await listSendingEventsOp(serverApi, { path: { identity_id: id }, query: { limit } }, { organizationId: opts.organizationId });
  return data;
}

export async function removeSendingIdentity(id: string): Promise<void> {
  await disableSendingIdentity(serverApi, { path: { identity_id: id } });
}

export async function getSendingPolicy(
  organizationId?: string,
): Promise<SendingPolicyView> {
  const data = await getSendingPolicyOp(serverApi, { query: organizationId ? { organization_id: organizationId } : undefined });
  return data;
}

/** The per-org kill switch. Takes effect at the server's gate immediately. */
export async function setSendingPolicy(
  outreachEnabled: boolean,
  reason?: string,
  organizationId?: string,
): Promise<SendingPolicyView> {
  const data = await setSendingPolicyOp(serverApi, { body: {
    outreach_enabled: outreachEnabled,
    reason: reason ?? null,
    organization_id: organizationId ?? null,
  } });
  return data;
}

/**
 * Server-only facts for the production bring-up checklist — deployment config,
 * vendor-key presence (booleans, never values), gmail.readonly state.
 *
 * The response type and route come from the generated backend contract.
 */
export async function getBringUpReadiness(
  organizationId?: string,
): Promise<BringUpReadiness> {
  const data = await getBringUpReadinessOp(serverApi, { query: organizationId ? { organization_id: organizationId } : undefined });
  return data;
}
