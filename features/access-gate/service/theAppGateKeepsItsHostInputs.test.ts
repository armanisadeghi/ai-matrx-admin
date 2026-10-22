/**
 * @jest-environment node
 */
/**
 * THE WEB APP'S ACCESS GATE KEEPS ITS OWN INPUTS.
 *
 * The resolver client lives in `@ai-matrx/data/access`; the app hands it what only the app has:
 * the browser Supabase client, the PINNED-KEY claims reader (`@/utils/supabase/claimsUser`, never a
 * JWKS fetch on a cold page), the organization-carrying fetch for website/page tokens, and the
 * website/page words. Each case below fails if one of those inputs stops reaching the resolver.
 */

const rpc = jest.fn(async (..._args: unknown[]) => ({ data: ANSWER as unknown, error: null }));
const client = { rpc, schema: () => ({ rpc }) };
jest.mock("@/utils/supabase/client", () => ({ createClient: () => client }));
const pinnedReader = jest.fn(async () => ({ data: { user: { id: "u" } }, error: null }));
jest.mock("@/utils/supabase/claimsUser", () => ({ getClaimsUser: (...a: unknown[]) => pinnedReader(...(a as [])) }));
const cmsFetch = jest.fn(async (..._args: unknown[]) => ({
  ok: true,
  json: async () => ({ disclosure: "kind_only", level: "none", entity: { token: "client_site" } }),
}));
jest.mock("@/lib/organizations/fetchWithOrganization", () => ({
  fetchWithOrganization: (...a: unknown[]) => cmsFetch(...a),
}));

import { fetchAccessDeniedContext, resolveAccessGateSlug } from "./accessDeniedContext";

const ID = "6a1d0c2b-3e4f-4a5b-9c6d-7e8f9a0b1c2d";
const ANSWER = {
  level: "none",
  entity: { label: "Conversation", token: "conversation" },
  is_owner: true,
  disclosure: "kind_only",
  can_request: true,
  organization_archived: { id: ID, name: "Harbor Point Physical Therapy" },
};

describe("the web app's access gate keeps its host inputs", () => {
  beforeEach(() => {
    rpc.mockClear();
    pinnedReader.mockClear();
    cmsFetch.mockClear();
  });

  it("asks who is signed in with the app's pinned-key reader, on the app's client", async () => {
    await fetchAccessDeniedContext("conversation", ID);
    expect(pinnedReader).toHaveBeenCalledTimes(1);
    expect(pinnedReader).toHaveBeenCalledWith(client);
  });

  it("carries an archived organization through to the screen", async () => {
    const got = await fetchAccessDeniedContext("conversation", ID);
    expect(got.organizationArchived).toEqual({ id: ID, name: "Harbor Point Physical Therapy" });
  });

  it("a website is asked through the organization-carrying fetch and called a website", async () => {
    const got = await fetchAccessDeniedContext("client_site", ID);
    expect(cmsFetch).toHaveBeenCalledTimes(1);
    expect(cmsFetch.mock.calls[0][0]).toBe("/api/cms/access-context");
    expect(rpc).not.toHaveBeenCalled();
    expect(got.entity.label).toBe("website");
  });

  it("a page with a broken link is a missing page, said as a page", async () => {
    const got = await fetchAccessDeniedContext("client_page", "not-a-uuid");
    expect(got.status).toBe("missing");
    expect(got.entity.label).toBe("page");
  });

  it("a slug resolves through the app's client", async () => {
    rpc.mockResolvedValueOnce({ data: ID, error: null });
    await expect(resolveAccessGateSlug("organization", "harbor-point")).resolves.toBe(ID);
  });
});
