/**
 * The TEST RECEIVER for table webhooks (lane AT-DBFIX item 4).
 *
 * A table webhook (`custom.table_webhook_declare`) is delivered by the database itself
 * (`files.webhook_dispatch` -> pg_net), signed `X-Matrx-Signature: sha256=<hmac-sha256 of the raw
 * body, keyed by the webhook's secret>`. Until this existed a tester had no https address of ours
 * that the database could reach, so delivery could be declared but never observed.
 *
 * WHAT IT ACCEPTS. Only a delivery from a webhook that EXISTS and whose own address is this route
 * (`files.webhooks.target_url` ends with the sink path): nobody can write rows here by guessing.
 * WHAT IT KEEPS. One `communication.webhook_test_receipt` row per delivery: the body, the signature
 * header, and `signature_valid` — the receiver's OWN recomputation over the raw bytes it received.
 * A wrong signature is kept too (valid = false) and answered 401: nothing is dropped silently.
 * It never posts anywhere.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/utils/supabase/adminClient";

/**
 * The generated database types do not know `files.webhooks` or the new receipts table, so this
 * door names exactly the two calls it makes instead of leaning on them.
 */
interface Answer<T> {
  data: T | null;
  error: { message: string } | null;
}
interface HookRow {
  id: string;
  secret: string;
  target_url: string | null;
  organization_id: string | null;
  created_by: string | null;
}
interface SinkDb {
  schema(name: string): {
    from(table: string): {
      select(cols: string): {
        eq(col: string, value: string): { maybeSingle(): Promise<Answer<HookRow>> };
      };
      insert(row: Record<string, unknown>): { select(cols: string): { single(): Promise<Answer<{ id: string }>> } };
    };
  };
}

export const SINK_PATH = "/api/webhooks/records-test-sink";

/** `sha256=<hex>` as the dispatcher sends it. */
export function signatureMatches(secret: string, rawBody: string, header: string | null): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const want = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = header.slice("sha256=".length);
  if (got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got, "utf8"), Buffer.from(want, "utf8"));
}

export type SinkResult =
  | { status: 200; id: string; valid: true }
  | { status: 401; id: string; valid: false }
  | { status: 400 | 404 | 500; error: string };

export async function receiveWebhookDelivery(request: {
  rawBody: string;
  headers: { get(name: string): string | null };
}): Promise<SinkResult> {
  const webhookId = request.headers.get("x-matrx-webhook-id");
  if (!webhookId || !/^[0-9a-f-]{36}$/i.test(webhookId)) {
    return { status: 400, error: "X-Matrx-Webhook-Id is missing" };
  }
  const admin = createAdminClient() as unknown as SinkDb;
  const { data: hook, error: hookError } = await admin
    .schema("files")
    .from("webhooks")
    .select("id, secret, target_url, organization_id, created_by")
    .eq("id", webhookId)
    .maybeSingle();
  if (hookError) return { status: 500, error: hookError.message };
  if (!hook || !String(hook.target_url ?? "").includes(SINK_PATH) || !hook.organization_id) {
    return { status: 404, error: "no webhook of ours points here with that id" };
  }
  const valid = signatureMatches(String(hook.secret), request.rawBody, request.headers.get("x-matrx-signature"));
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(request.rawBody);
  } catch {
    parsed = null;
  }
  const { data, error } = await admin
    .schema("communication")
    .from("webhook_test_receipt")
    .insert({
      webhook_id: hook.id,
      event: request.headers.get("x-matrx-event"),
      delivery_event_id: request.headers.get("x-matrx-delivery-event"),
      signature: request.headers.get("x-matrx-signature"),
      signature_valid: valid,
      received_body: parsed,
      raw_body: request.rawBody,
      organization_id: hook.organization_id,
      created_by: hook.created_by,
    })
    .select("id")
    .single();
  if (error || !data) return { status: 500, error: error?.message ?? "the receipt was not written" };
  return valid ? { status: 200, id: data.id as string, valid: true } : { status: 401, id: data.id as string, valid: false };
}
