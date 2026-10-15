import type { components } from "@ai-matrx/api/types";
import { confirmOutletContactCandidate, listOutletContactCandidates } from "@ai-matrx/api/crm";
import { serverApi } from "@/lib/api/server-api";

export type OutletContactExtraction =
  components["schemas"]["OutletContactExtraction"];
export type OutletContactCandidate =
  components["schemas"]["OutletContactCandidate"];
export type ObservedEmailCandidate =
  components["schemas"]["ObservedEmailCandidate"];
export type ConfirmedOutletContact =
  components["schemas"]["ConfirmedOutletContact"];

const CANDIDATES_PATH = "/crm/parties/{outlet_party_id}/contact-candidates";
const CONFIRM_PATH =
  "/crm/parties/{outlet_party_id}/contact-candidates/confirm";

/** Read current crawl-backed suggestions. The server guarantees this is zero-write. */
export async function fetchOutletContactCandidates(
  outletPartyId: string,
): Promise<OutletContactExtraction> {
  const data = await listOutletContactCandidates(serverApi, { path: { outlet_party_id: outletPartyId } });
  return data;
}

/** Confirm one server-revalidated person and only the selected observed addresses. */
export async function confirmOutletContact(
  outletPartyId: string,
  input: {
    candidateKey: string;
    emailKeys: string[];
    acceptLowConfidence: boolean;
    acceptRoleAddress: boolean;
  },
): Promise<ConfirmedOutletContact> {
  const data = await confirmOutletContactCandidate(serverApi, { path: { outlet_party_id: outletPartyId }, body: {
      candidate_key: input.candidateKey,
      email_keys: input.emailKeys,
      accept_low_confidence: input.acceptLowConfidence,
      accept_role_address: input.acceptRoleAddress,
    } });
  return data;
}
