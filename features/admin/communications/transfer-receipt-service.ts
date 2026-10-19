import { createClient } from "@/utils/supabase/client";
import { parseVoiceTransferObservation } from "@/lib/communications/voice/transfer-receipt";
import { readVoiceTransferReceiptWithClient } from "@/lib/communications/voice/transfer-receipt-reader";

/** Re-read the exact selected observation, then expand globally by account + child leg. */
export async function loadTransferReceipt(eventId: number, callId: string) {
  const client = createClient();
  const { data: admin, error: adminError } = await client
    .rpc("is_platform_admin")
    .abortSignal(AbortSignal.timeout(10000));
  if (adminError || admin !== true)
    throw Error("Open the administrator console to review transfer results.");
  const { data: event, error } = await client
    .schema("platform")
    .from("activity_log")
    .select("id,entity_type,entity_id,organization_id,metadata")
    .eq("id", eventId)
    .eq("action", "voice.call.transfer_result.observed")
    .eq("entity_type", "crm_interaction")
    .eq("entity_id", callId)
    .abortSignal(AbortSignal.timeout(10000))
    .maybeSingle();
  if (
    error ||
    !event ||
    event.id !== eventId ||
    event.entity_id !== callId ||
    event.entity_type !== "crm_interaction"
  )
    throw Error("Transfer observation is unavailable. Refresh the callbacks.");
  const result = parseVoiceTransferObservation(event);
  if (!result) throw Error("Transfer observation could not be read.");
  return readVoiceTransferReceiptWithClient(client, result, eventId);
}
