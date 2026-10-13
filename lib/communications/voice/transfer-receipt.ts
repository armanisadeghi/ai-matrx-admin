import { isJsonObject } from "@/types/json";
import type { Tables } from "@/types/database.types";
import {
  parseVoiceTransferResult,
  type VoiceTransferResult,
} from "./transfer-result";
export type TransferObservation = Pick<
  Tables<{ schema: "platform" }, "activity_log">,
  "id" | "entity_type" | "entity_id" | "organization_id" | "metadata"
>;
type EvidenceBounds = {
  deliveryCount: number;
  firstEventId: number;
  lastEventId: number;
};
export type VoiceTransferReceipt = EvidenceBounds &
  (
    | { state: "conflict" }
    | {
        state: "consistent";
        result: VoiceTransferResult;
        interactionId: string;
        organizationId: string;
        connection: "connected" | "not-connected" | "unknown";
      }
  );
/** A current ledger snapshot, never an atomic exactly-once claim or task-completion claim. */
export function projectVoiceTransferReceipt(
  rows: TransferObservation[],
  expected: VoiceTransferResult,
  appendedEventId: number,
): VoiceTransferReceipt {
  if (
    !rows.length ||
    rows.length > 1000 ||
    !rows.some((row) => row.id === appendedEventId) ||
    rows.some((row) => !Number.isSafeInteger(row.id) || row.id <= 0) ||
    new Set(rows.map((row) => row.id)).size !== rows.length
  )
    throw Error("Transfer evidence snapshot unavailable");
  const bounds = {
    deliveryCount: rows.length,
    firstEventId: Math.min(...rows.map((row) => row.id)),
    lastEventId: Math.max(...rows.map((row) => row.id)),
  };
  const first = rows[0];
  if (!first.entity_id || !first.organization_id)
    return { ...bounds, state: "conflict" };
  for (const row of rows) {
    const m = row.metadata;
    if (
      !isJsonObject(m) ||
      row.entity_type !== "crm_interaction" ||
      !row.entity_id ||
      !row.organization_id ||
      row.entity_id !== first.entity_id ||
      row.organization_id !== first.organization_id
    )
      return { ...bounds, state: "conflict" };
    if (
      m.provider !== "twilio" ||
      m.provider_event_key !==
        `twilio:${expected.providerAccountId}:${expected.providerDialCallId}` ||
      typeof m.provider_account_id !== "string" ||
      typeof m.provider_call_id !== "string" ||
      typeof m.provider_dial_call_id !== "string" ||
      typeof m.status !== "string" ||
      (m.duration_seconds !== null &&
        (typeof m.duration_seconds !== "number" ||
          !Number.isInteger(m.duration_seconds))) ||
      (m.bridged !== null && typeof m.bridged !== "boolean")
    )
      return { ...bounds, state: "conflict" };
    const parsed = parseVoiceTransferResult({
      AccountSid: m.provider_account_id,
      CallSid: m.provider_call_id,
      DialCallSid: m.provider_dial_call_id,
      DialCallStatus: m.status,
      ...(m.duration_seconds === null
        ? {}
        : { DialCallDuration: String(m.duration_seconds) }),
      ...(m.bridged === null ? {} : { DialBridged: String(m.bridged) }),
    });
    if (
      !parsed ||
      parsed.providerAccountId !== expected.providerAccountId ||
      parsed.providerCallId !== expected.providerCallId ||
      parsed.providerDialCallId !== expected.providerDialCallId ||
      parsed.status !== expected.status ||
      parsed.durationSeconds !== expected.durationSeconds ||
      parsed.bridged !== expected.bridged
    )
      return { ...bounds, state: "conflict" };
  }
  return {
    ...bounds,
    state: "consistent",
    result: expected,
    interactionId: first.entity_id,
    organizationId: first.organization_id,
    connection:
      expected.status === "completed" && expected.bridged === true
        ? "connected"
        : expected.bridged === false
          ? "not-connected"
          : "unknown",
  };
}
