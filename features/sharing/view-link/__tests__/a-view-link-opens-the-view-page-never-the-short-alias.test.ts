// The URL handed out for a view link is /v/<token> (the read-only view page), never the /r/ short alias that the
// mint door also makes (that one opens the generic record viewer), and the mint is a Viewer link on a saved view.
// jest globals
const rpc = jest.fn();
const createShareLink = jest.fn();

jest.mock("@ai-matrx/records/core", () => ({ storeDoors: () => ({ rpc }) }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/permissions/shareLinks", () => ({ createShareLink: (...a: unknown[]) => createShareLink(...a) }));

import { listViewLinks, makeViewLink, turnOffViewLink, viewLinkUrl } from "../viewLinkService";

const TOKEN = "ab".repeat(32);

it("builds /v/<token> on the given base, trailing slash or not", () => {
  expect(viewLinkUrl(TOKEN, "https://app.example.com/")).toBe(`https://app.example.com/v/${TOKEN}`);
  expect(viewLinkUrl(TOKEN, "https://app.example.com")).toBe(`https://app.example.com/v/${TOKEN}`);
  expect(viewLinkUrl(TOKEN, "https://app.example.com")).not.toContain("/r/");
});

it("mints a viewer link on a saved view, and passes the store's refusal sentence on as is", async () => {
  createShareLink.mockResolvedValueOnce({ success: false, error: "You need Edit or Full access on this to share it." });
  expect(await makeViewLink("v1", "Client Approval")).toEqual({ ok: false, error: "You need Edit or Full access on this to share it." });
  expect(createShareLink).toHaveBeenCalledWith({ resourceType: "platform_saved_view", resourceId: "v1", permissionLevel: "viewer", label: "Client Approval" });
});

it("lists through the view door and names who made each link", async () => {
  rpc.mockResolvedValueOnce({
    data: [{ id: "l1", token: TOKEN, label: null, use_count: 2, last_used_at: null, created_at: "2026-10-14T10:00:00Z", created_by: "u1", created_by_name: "Priya", made_by_me: false }],
    error: null,
  });
  const links = await listViewLinks("v1");
  expect(rpc).toHaveBeenCalledWith("view_share_links", { p_view_id: "v1" });
  expect(links[0]).toMatchObject({ id: "l1", createdByName: "Priya", madeByMe: false, useCount: 2 });
});

it("turns a link off through the revoke door, and says why when it refuses", async () => {
  rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
  expect(await turnOffViewLink("l1")).toEqual({ ok: true });
  rpc.mockResolvedValueOnce({ data: { success: false, error: "Link not found or not yours" }, error: null });
  expect(await turnOffViewLink("l2")).toEqual({ ok: false, error: "Link not found or not yours" });
  expect(rpc).toHaveBeenLastCalledWith("revoke_view_share_link", { p_link_id: "l2" });
});
