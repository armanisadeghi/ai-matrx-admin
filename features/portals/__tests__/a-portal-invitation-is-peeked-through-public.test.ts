/**
 * The accept page's "what is on offer" door lives in schema `public`; only accept is in `custom`.
 * Asking `custom` answered "Could not find the function custom.portal_share_peek" to every client.
 */
const publicRpc = jest.fn().mockResolvedValue({ data: { state: "ready", usable: true, say: "ok" }, error: null });
const customRpc = jest.fn().mockResolvedValue({ data: null, error: { message: "Could not find the function custom.portal_share_peek(p_token) in the schema cache" } });
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ rpc: publicRpc }) }));
jest.mock("@ai-matrx/records/core", () => ({ storeDoors: () => ({ rpc: customRpc }) }));

import { peekPortalShare } from "../portalInviteService";

test("peeking an invitation asks public.portal_share_peek, never custom", async () => {
  const peek = await peekPortalShare("tok");
  expect(publicRpc).toHaveBeenCalledWith("portal_share_peek", { p_token: "tok" });
  expect(customRpc).not.toHaveBeenCalled();
  expect(peek.state).toBe("ready");
});
