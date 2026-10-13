/** Caller continuation after an attempted human transfer. */
import { NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/communications/providers/twilio/webhook-validation";
import {
  buildVoiceTransferEndedTwiml,
  buildVoiceTransferUnconfirmedTwiml,
  VOICE_TRANSFER_ENDED_PATH,
} from "@/lib/communications/providers/twilio/voice-twiml";

import { parseVoiceTransferResult } from "@/lib/communications/voice/transfer-result";
import { recordVoiceTransferResultObservation } from "@/lib/communications/voice/transfer-result-persistence";

import { readVoiceTransferReceipt } from "@/lib/communications/voice/transfer-receipt-persistence";

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
    const eventId = await recordVoiceTransferResultObservation(result);
    const receipt = await readVoiceTransferReceipt(result, eventId);
    return new NextResponse(
      receipt.state === "conflict"
        ? buildVoiceTransferUnconfirmedTwiml(validation.params.CallStatus)
        : buildVoiceTransferEndedTwiml(validation.params),
      {
        headers: {
          "Content-Type": "text/xml",
          "X-Matrx-Transfer-Receipt-State": receipt.state,
        },
      },
    );
  } catch {
    // No raw provider payload/error content in logs or responses. Retrying only appends evidence.
    console.error(
      "Twilio transfer observation or receipt projection unavailable",
    );
    return new NextResponse("Transfer callback not accepted", { status: 503 });
  }
}
