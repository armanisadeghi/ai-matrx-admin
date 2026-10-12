/**
 * `platform.associations` grants `authenticated` SELECT only (live, 2026-10-12), so a browser
 * `.insert()` into it always fails with 42501 and no tracked-account -> website-competitor edge
 * was ever written. The link must go through the association chokepoint (`assoc_add` RPC).
 */
const insertSpy = jest.fn();
const addSpy = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({ from: () => ({ insert: insertSpy }) }),
    from: () => ({ insert: insertSpy }),
  },
}));
jest.mock("@ai-matrx/auth", () => ({ ...jest.requireActual("@ai-matrx/auth"), ...(() => ({ getClaimsUser: jest.fn() }))() }));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { add: (...a: unknown[]) => addSpy(...a) },
}));
jest.mock("@/lib/api/call-api", () => ({ callApi: jest.fn() }));
jest.mock("../social/server", () => ({ trackAccount: jest.fn(), socialErrorMessage: jest.fn() }));
jest.mock("../social/post-count", () => ({ rememberedMaxPostsPlain: jest.fn() }));
jest.mock("../social/stream", () => ({ SocialStreamError: class extends Error {} }));
jest.mock("@ai-matrx/api", () => ({
  ...jest.requireActual("@ai-matrx/api"),
  BackendApiError: class extends Error {},
}));

import { linkAccountToWebsiteCompetitor } from "./brand-competitors";

describe("linkAccountToWebsiteCompetitor", () => {
  beforeEach(() => {
    insertSpy.mockReset();
    addSpy.mockReset();
  });

  it("writes the edge through the association service, never a direct insert", async () => {
    addSpy.mockResolvedValue({ ok: true });
    await linkAccountToWebsiteCompetitor("acct-1", "comp-1", "org-1");
    expect(insertSpy).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "social_tracked_account",
        sourceId: "acct-1",
        targetType: "seo_competitor",
        targetId: "comp-1",
        orgId: "org-1",
      }),
    );
  });

  it("throws when the service refuses, so the caller can say so", async () => {
    addSpy.mockResolvedValue({ ok: false, error: { message: "refused" } });
    await expect(linkAccountToWebsiteCompetitor("a", "c", "o")).rejects.toThrow("refused");
  });
});
