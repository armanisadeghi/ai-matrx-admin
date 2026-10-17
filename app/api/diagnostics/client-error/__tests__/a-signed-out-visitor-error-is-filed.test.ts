/**
 * @jest-environment node
 */

/**
 * A signed-out visitor whose fingerprint has no guest row yet still had a real error on a real
 * page. Until 2026-10-16 this route answered 404 "Unknown guest identity" (twice per signed-out
 * /chat/new load on aimatrx.com) and the error was dropped. It must be FILED: system
 * organization, no user, identity "anonymous".
 */
const recorded: Record<string, unknown>[] = [];
let guestRow: { auth_user_id: string | null } | null = null;

jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({
    schema: (schema: string) => ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: guestRow, error: null }) }) }),
      }),
      rpc: async (fn: string, args: { p_error: Record<string, unknown> }) => {
        if (schema === "ops" && fn === "record_system_error") recorded.push(args.p_error);
        return { error: null };
      },
    }),
  }),
}));
jest.mock("@/lib/organizations/systemOrg", () => ({ resolveSystemOrgId: async () => "system-org" }));
jest.mock("@ai-matrx/agents/generated/source-attribution", () => ({ isSourceFeature: () => true }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/diagnostics/client-error/route";

function body() {
  return {
    fingerprint: "abcdefghijklmnop1234",
    source: "react",
    source_feature: "chat",
    message: "boom",
    code: null,
    route: "/chat/new",
    request_id: null,
    stack: null,
    payload: null,
    context: {},
  };
}

function request() {
  return new NextRequest("http://localhost/api/diagnostics/client-error", {
    method: "POST",
    body: JSON.stringify(body()),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  recorded.length = 0;
  guestRow = null;
});

it("files an error from a visitor with no guest row (never 404)", async () => {
  const res = await POST(request());
  expect(res.status).toBe(200);
  expect(recorded).toHaveLength(1);
  expect(recorded[0]).toMatchObject({ user_id: null, organization_id: "system-org", context: expect.objectContaining({ identity_state: "anonymous" }) });
});

it("still files a known guest as a guest", async () => {
  guestRow = { auth_user_id: null };
  const res = await POST(request());
  expect(res.status).toBe(200);
  expect(recorded[0]).toMatchObject({ context: expect.objectContaining({ identity_state: "guest" }) });
});
