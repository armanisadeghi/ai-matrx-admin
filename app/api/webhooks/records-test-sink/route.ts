/**
 * POST /api/webhooks/records-test-sink — where a TABLE WEBHOOK declared for testing can deliver.
 * Keeps each delivery (body, signature, whether the signature verified) in
 * communication.webhook_test_receipt, readable by the webhook's organization. Harness only.
 * See lib/webhooks/records-test-sink.ts.
 */
import { NextResponse } from "next/server";

import { receiveWebhookDelivery } from "@/lib/webhooks/records-test-sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const result = await receiveWebhookDelivery({ rawBody, headers: request.headers });
  if ("error" in result) {
    return NextResponse.json({ received: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ received: true, id: result.id, signature_valid: result.valid }, { status: result.status });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    webhook: "AI Matrx table-webhook test receiver",
    method: "POST",
    keeps: "communication.webhook_test_receipt",
    accepts: "deliveries of webhooks whose address is this route",
  });
}
