import { createClient } from "@/utils/supabase/client";
import { readAllRows } from "@ai-matrx/data/db";
import type { Tables } from "@/types/database.types";
import { normalizeVoiceTransferTarget } from "@/lib/communications/voice/transfer-target";
export type VoiceDestination = Tables<
  { schema: "communication" },
  "sms_phone_numbers"
>;
export async function loadVoiceDestinations(): Promise<VoiceDestination[]> {
  const client = createClient();
  const { data: admin, error } = await client
    .rpc("is_platform_admin")
    .abortSignal(AbortSignal.timeout(10000));
  if (error || admin !== true)
    throw Error("Open the administrator console to configure voice transfers.");
  return readAllRows(
    ({ from, to }) =>
      client
        .schema("communication")
        .from("sms_phone_numbers")
        .select("*", { count: "exact" })
        .eq("program_key", "ai_matrx_owner_beta")
        .is("deleted_at", null)
        .order("id")
        .range(from, to)
        .abortSignal(AbortSignal.timeout(10000)),
    { label: "Voice transfer destinations" },
  );
}
export async function saveVoiceTransferTarget(
  row: VoiceDestination,
  raw: string,
): Promise<VoiceDestination> {
  const target = normalizeVoiceTransferTarget(raw, row.phone_number);
  const { data, error } = await createClient()
    .schema("communication")
    .rpc("set_voice_transfer_target", {
      p_destination_id: row.id,
      p_organization_id: row.organization_id,
      p_expected_version: row.version,
      ...(target === null ? {} : { p_target: target }),
    })
    .abortSignal(AbortSignal.timeout(10000));
  if (error)
    throw Error(
      error.code === "PT409" || error.code === "40001"
        ? "This line changed. Reload before saving."
        : "The save could not be confirmed. Reload before trying again.",
    );
  if (!data || data.length !== 1)
    throw Error(
      "The transfer number could not be confirmed. Reload before saving.",
    );
  return data[0];
}
