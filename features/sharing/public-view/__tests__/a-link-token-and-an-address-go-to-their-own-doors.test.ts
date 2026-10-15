// A shared-by-link token (64 hex) reaches ONLY the link door and a published address ONLY the publish door:
// a token never gets a second try at the address door, and a malformed string reaches neither.
// jest globals
const rpc = jest.fn();

jest.mock("@ai-matrx/records/core", () => ({ storeDoors: () => ({ rpc }) }));
jest.mock("@/utils/supabase/adminClient", () => ({ createAdminClient: () => ({}) }));
jest.mock("react", () => ({ ...jest.requireActual("react"), cache: <T,>(fn: T) => fn }));

import { publishedView } from "../service";

const TOKEN = "0123456789abcdef".repeat(4);

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

it("sends a link token to shared_view_read, and only there", async () => {
  rpc.mockResolvedValueOnce({ data: { state: "open", title: "Client Approval" }, error: null });
  const view = await publishedView(TOKEN);
  expect(view).toMatchObject({ title: "Client Approval" });
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("shared_view_read", { p_token: TOKEN, p_password: null, p_unlock: null });
});

it("answers null (the 404) for a token the link door does not know, without trying the address door", async () => {
  expect(await publishedView(TOKEN)).toBeNull();
  expect(rpc.mock.calls.map((c) => c[0])).toEqual(["shared_view_read"]);
});

it("sends a published address to published_view_read, and only there", async () => {
  await publishedView("northwind-approval-board");
  expect(rpc.mock.calls).toEqual([["published_view_read", { p_slug: "northwind-approval-board" }]]);
});

it("reaches no door for a string that is neither", async () => {
  expect(await publishedView("NOT A SLUG")).toBeNull();
  expect(await publishedView("a")).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
});

it("says so when the link door itself refuses, never a quiet 404", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: "permission denied" } });
  await expect(publishedView(TOKEN)).rejects.toThrow(/shared_view_read refused/);
});
