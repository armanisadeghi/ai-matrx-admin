/**
 * Mandate Candidates — the client half of the live-candidate doors (PLAN §2.4).
 *
 * Every call goes through the contract-bound typed client, so the request and
 * response shapes are the GENERATED `LiveCandidate*` types — never a hand copy.
 * The payload (the sensitive half, A2) is read by the server under the viewer's
 * own identity; a viewer who may see the mandate but not the live conversation
 * gets `payload: null` + `payload_withheld_reason`, which the pair body shows.
 */

import type { components } from "@ai-matrx/api/types";
import { getMandateCandidate, getMandateCandidateRun, postMandateCandidateDiscard, postMandateCandidatePromote, postMandateCandidatePutBack, postMandateCandidateRunAgreement } from "@ai-matrx/api/intelligence";
import { serverApi } from "@/lib/api/server-api";

export type LiveCandidate = components["schemas"]["LiveCandidate"];
export type LiveCandidateRun = components["schemas"]["LiveCandidateRun"];
export type LiveCandidateRunPayload = components["schemas"]["LiveCandidateRunPayload"];
export type LiveCandidateDetail = components["schemas"]["LiveCandidateDetail"];
export type LiveCandidateToolDisposition =
  components["schemas"]["LiveCandidateToolDisposition"];
export type LiveCandidatePromoteResult = components["schemas"]["LiveCandidatePromoteResult"];
export type LiveCandidateVersionChoice = components["schemas"]["LiveCandidateVersionChoice"];

export async function fetchCandidateRun(runId: string): Promise<LiveCandidateRun> {
  const data = await getMandateCandidateRun(serverApi, { path: { run_id: runId } });
  return data;
}

export async function fetchCandidate(candidateId: string): Promise<LiveCandidateDetail> {
  const data = await getMandateCandidate(serverApi, { path: { candidate_id: candidateId } });
  return data;
}

export async function recordCandidateAgreement(
  runId: string,
  agreement: "agree" | "disagree",
): Promise<LiveCandidateRun> {
  const data = await postMandateCandidateRunAgreement(serverApi, { path: { run_id: runId }, body: { agreement } });
  return data.run;
}

export async function promoteCandidate(
  candidateId: string,
  versionId?: string | null,
): Promise<LiveCandidatePromoteResult> {
  const data = await postMandateCandidatePromote(serverApi, { path: { candidate_id: candidateId }, body: versionId ? { version_id: versionId } : {} });
  return data;
}

export async function putBackCandidate(candidateId: string): Promise<LiveCandidate> {
  const data = await postMandateCandidatePutBack(serverApi, { path: { candidate_id: candidateId } });
  return data;
}

export async function discardCandidate(candidateId: string): Promise<LiveCandidate> {
  const data = await postMandateCandidateDiscard(serverApi, { path: { candidate_id: candidateId }, body: {} });
  return data;
}
