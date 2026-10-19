import "server-only";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { VoicePersistenceError } from "./persistence";
import type { VoiceTransferResult } from "./transfer-result";
import type { VoiceTransferReceipt } from "./transfer-receipt";
import {
  readVoiceTransferReceiptWithClient,
  TransferReceiptReadError,
} from "./transfer-receipt-reader";
/** Provider callback adapter; admin UI uses the same reader with its RLS client. */
export async function readVoiceTransferReceipt(
  result: VoiceTransferResult,
  appendedEventId: number,
): Promise<VoiceTransferReceipt> {
  try {
    return await readVoiceTransferReceiptWithClient(
      createAdminClient(),
      result,
      appendedEventId,
    );
  } catch (error) {
    if (error instanceof TransferReceiptReadError)
      throw new VoicePersistenceError(error.message, error.databaseCode);
    throw error;
  }
}
