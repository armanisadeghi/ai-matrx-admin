import "server-only";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { VoicePersistenceError } from "./persistence";
import type { VoiceTransferResult } from "./transfer-result";

/** Each signed delivery is one observation. Replays append evidence, never replay call work. */
export async function recordVoiceTransferResultObservation(
  result: VoiceTransferResult,
): Promise<number> {
  const client = createAdminClient();
  const { data: interaction, error } = await client
    .schema("crm")
    .from("interaction")
    .select("id,organization_id")
    .eq("channel_code", "call")
    .eq("provider", "twilio")
    .eq("provider_account_id", result.providerAccountId)
    .eq("provider_interaction_id", result.providerCallId)
    .is("deleted_at", null)
    .single();
  if (error || !interaction)
    throw new VoicePersistenceError(
      "Transfer observation has no exact canonical parent call",
      error?.code ?? "P0002",
    );
  const { data: eventId, error: writeError } = await client
    .schema("platform")
    .rpc("log_activity", {
      p_org: interaction.organization_id,
      p_action: "voice.call.transfer_result.observed",
      p_entity_type: "crm_interaction",
      p_entity_id: interaction.id,
      // Provider evidence has no human actor; service-role auth.uid() is null.
      p_metadata: {
        provider: "twilio",
        provider_account_id: result.providerAccountId,
        provider_call_id: result.providerCallId,
        provider_dial_call_id: result.providerDialCallId,
        provider_event_key: `twilio:${result.providerAccountId}:${result.providerDialCallId}`,
        status: result.status,
        duration_seconds: result.durationSeconds,
        bridged: result.bridged,
      },
    });
  if (
    writeError ||
    typeof eventId !== "number" ||
    !Number.isSafeInteger(eventId) ||
    eventId <= 0
  )
    throw new VoicePersistenceError(
      "Transfer observation was not durably recorded",
      writeError?.code ?? null,
    );
  return eventId;
}
