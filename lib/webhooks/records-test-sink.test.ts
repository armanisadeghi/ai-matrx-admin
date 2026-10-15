/** @jest-environment node */
import { createHmac } from "node:crypto";

jest.mock("server-only", () => ({}));

const inserted: Array<Record<string, unknown>> = [];
let hook: Record<string, unknown> | null = null;
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({
    schema: (s: string) => ({
      from: (t: string) => {
        if (s === "files" && t === "webhooks") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: hook, error: null }) }) }) };
        }
        return {
          insert: (row: Record<string, unknown>) => {
            inserted.push(row);
            return { select: () => ({ single: async () => ({ data: { id: "receipt-1" }, error: null }) }) };
          },
        };
      },
    }),
  }),
}));

import { receiveWebhookDelivery, signatureMatches } from "./records-test-sink";

const SECRET = "whsec_venue_bookings_test";
const BODY = '{"event": "record.updated", "entity_id": "349cfca1"}';
const sign = (body: string, secret = SECRET) => "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });
const WH = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

beforeEach(() => {
  inserted.length = 0;
  hook = { id: WH, secret: SECRET, target_url: "https://www.aimatrx.com/api/webhooks/records-test-sink", organization_id: "org-1", created_by: "u-1" };
});

describe("the table-webhook test receiver", () => {
  it("verifies the signature over the raw body the dispatcher sends", () => {
    expect(signatureMatches(SECRET, BODY, sign(BODY))).toBe(true);
    expect(signatureMatches(SECRET, BODY + " ", sign(BODY))).toBe(false);
    expect(signatureMatches("another", BODY, sign(BODY))).toBe(false);
    expect(signatureMatches(SECRET, BODY, null)).toBe(false);
  });

  it("keeps a correctly signed delivery with signature_valid true", async () => {
    const r = await receiveWebhookDelivery({ rawBody: BODY, headers: headers({ "x-matrx-webhook-id": WH, "x-matrx-signature": sign(BODY), "x-matrx-event": "record.updated", "x-matrx-delivery-event": "42" }) });
    expect(r).toMatchObject({ status: 200, valid: true });
    expect(inserted[0]).toMatchObject({ webhook_id: WH, signature_valid: true, event: "record.updated", delivery_event_id: "42", organization_id: "org-1" });
  });

  it("keeps a wrongly signed delivery as invalid and answers 401", async () => {
    const r = await receiveWebhookDelivery({ rawBody: BODY, headers: headers({ "x-matrx-webhook-id": WH, "x-matrx-signature": sign(BODY, "forged") }) });
    expect(r).toMatchObject({ status: 401, valid: false });
    expect(inserted[0]).toMatchObject({ signature_valid: false });
  });

  it("writes nothing for a webhook that does not point here or does not exist", async () => {
    hook = { ...hook!, target_url: "https://hooks.example.com/other" };
    expect((await receiveWebhookDelivery({ rawBody: BODY, headers: headers({ "x-matrx-webhook-id": WH, "x-matrx-signature": sign(BODY) }) })).status).toBe(404);
    hook = null;
    expect((await receiveWebhookDelivery({ rawBody: BODY, headers: headers({ "x-matrx-webhook-id": WH }) })).status).toBe(404);
    expect((await receiveWebhookDelivery({ rawBody: BODY, headers: headers({}) })).status).toBe(400);
    expect(inserted).toHaveLength(0);
  });
});
