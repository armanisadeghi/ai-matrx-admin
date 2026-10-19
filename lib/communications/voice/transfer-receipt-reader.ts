import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { VoiceTransferResult } from "./transfer-result";
import {
  projectVoiceTransferReceipt,
  type VoiceTransferReceipt,
} from "./transfer-receipt";
export class TransferReceiptReadError extends Error {
  constructor(
    message: string,
    readonly databaseCode: string | null,
  ) {
    super(message);
  }
}

/** Group globally by child leg, so conflicting parent claims cannot disappear in a parent filter. */
export async function readVoiceTransferReceiptWithClient(
  client: Pick<SupabaseClient<Database>, "schema">,
  result: VoiceTransferResult,
  appendedEventId: number,
): Promise<VoiceTransferReceipt> {
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
    .abortSignal(AbortSignal.timeout(10000))
    .limit(1000);
  if (error || !data || count === null || count > 1000 || count !== data.length)
    throw new TransferReceiptReadError(
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
    .abortSignal(AbortSignal.timeout(10000))
    .maybeSingle();
  if (parentError)
    throw new TransferReceiptReadError(
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
