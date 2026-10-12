/** Caller continuation after an attempted human transfer. */
import { NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/communications/providers/twilio/webhook-validation";
import {
  buildVoiceTransferEndedTwiml,
  VOICE_TRANSFER_ENDED_PATH,
} from "@/lib/communications/providers/twilio/voice-twiml";

import { parseVoiceTransferResult } from "@/lib/communications/voice/transfer-result";
import { recordVoiceTransferResultObservation } from "@/lib/communications/voice/transfer-result-persistence";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const validation = await validateTwilioWebhook(
    request,
    VOICE_TRANSFER_ENDED_PATH,
  );
  if (!validation.valid) return new NextResponse("Forbidden", { status: 403 });
  const result = parseVoiceTransferResult(validation.params);
  if (!result) return new NextResponse("Bad Request", { status: 400 });
  try {
    await recordVoiceTransferResultObservation(result);
  } catch {
    // No raw provider payload/error content in logs or responses. Retrying only appends evidence.
    console.error("Twilio transfer observation could not be durably recorded");
    return new NextResponse("Transfer callback not accepted", { status: 503 });
  }
  return new NextResponse(buildVoiceTransferEndedTwiml(validation.params), {
    headers: { "Content-Type": "text/xml" },
  });
}
