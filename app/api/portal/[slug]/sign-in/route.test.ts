/**
 * An address that IS on the portal, whose bind our side could not write, must not be told
 * "a link is on its way" (it waited for a link that never came). A stranger's address still
 * gets the one sentence.
 */
const bind = jest.fn();
const invitation = jest.fn();
jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/email/client", () => ({ sendEmail: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock("@/features/portals/service", () => ({
  portalPublic: jest.fn().mockResolvedValue({ slug: "s", title: "T", organization: "O" }),
  portalInvitation: (...a: unknown[]) => invitation(...a),
  portalPrincipalBind: (...a: unknown[]) => bind(...a),
}));
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink: async () => ({ data: { properties: { hashed_token: "h" }, user: { id: "u" } }, error: null }) } } }),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

const call = (email: string) =>
  POST(new NextRequest("http://localhost/api/portal/s/sign-in", { method: "POST", body: JSON.stringify({ email }) }), { params: Promise.resolve({ slug: "s" }) });

test("a refused bind is reported, never answered with 'on its way'", async () => {
  invitation.mockResolvedValue({ organization_id: "o", principal_id: "p" });
  bind.mockRejectedValue(new Error("not a member"));
  const res = await call("a@b.test");
  expect(res.status).toBe(502);
  expect((await res.json()).ok).toBe(false);
});

test("an address that is not on the portal still gets the one sentence", async () => {
  invitation.mockResolvedValue(null);
  const res = await call("x@y.test");
  expect(res.status).toBe(200);
  expect((await res.json()).message).toMatch(/on its way/);
});
