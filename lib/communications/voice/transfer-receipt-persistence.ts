import "server-only";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { VoicePersistenceError } from "./persistence";
import type { VoiceTransferResult } from "./transfer-result";
import {
  projectVoiceTransferReceipt,
  type VoiceTransferReceipt,
} from "./transfer-receipt";
/** Group globally by child leg, so conflicting parent claims cannot disappear in a parent filter. */
export async function readVoiceTransferReceipt(
  result: VoiceTransferResult,
  appendedEventId: number,
): Promise<VoiceTransferReceipt> {
  const client = createAdminClient();
  const { data, error, count } = await client
    .schema("platform")
    .from("activity_log")
    .select("id,entity_type,entity_id,organization_id,metadata", {
      count: "exact",
    })
    .eq("action", "voice.call.transfer_result.observed")
    .contains("metadata", {
      provider_account_id: result.providerAccountId,
      provider_dial_call_id: result.providerDialCallId,
    })
    .order("id", { ascending: true })
    .limit(1000);
  if (error || !data || count === null || count > 1000 || count !== data.length)
    throw new VoicePersistenceError(
      "Transfer evidence snapshot unavailable",
      error?.code ?? null,
    );
  const receipt = projectVoiceTransferReceipt(data, result, appendedEventId);
  if (receipt.state === "conflict") return receipt;
  // Accepted historical evidence survives parent retirement; do not filter deleted_at here.
  const { data: parent, error: parentError } = await client
    .schema("crm")
    .from("interaction")
    .select(
      "channel_code,provider,provider_account_id,provider_interaction_id,organization_id",
    )
    .eq("id", receipt.interactionId)
    .maybeSingle();
  if (parentError)
    throw new VoicePersistenceError(
      "Transfer parent validation unavailable",
      parentError.code,
    );
  if (
    !parent ||
    parent.channel_code !== "call" ||
    parent.provider !== "twilio" ||
    parent.provider_account_id !== result.providerAccountId ||
    parent.provider_interaction_id !== result.providerCallId ||
    parent.organization_id !== receipt.organizationId
  )
    return {
      state: "conflict",
      deliveryCount: receipt.deliveryCount,
      firstEventId: receipt.firstEventId,
      lastEventId: receipt.lastEventId,
    };
  return receipt;
}
