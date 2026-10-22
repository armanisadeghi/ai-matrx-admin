/**
 * "[annotations] loading the comments failed ()" (ADVERSARIAL-1 #13). Leaving a page aborts its in-flight
 * cmt_list; supabase-js answers {message:"", code:""}, and humanError printed a console error for it on every
 * quick navigation. A read nobody is waiting for is silent; a dropped connection on a page still shown is tried
 * once more; a real refusal is still reported.
 */
const rpc = jest.fn();
jest.mock("@/features/scopes/host/associationsStore", () => ({ associationsDataSource: { rpc: (...a: unknown[]) => rpc(...a), schema: () => ({ rpc: (...a: unknown[]) => rpc(...a) }) } }));
jest.mock("@/utils/auth/getUserId", () => ({ getUserId: () => "me" }));
jest.mock("@/features/rich-document/annotations/service", () => ({ deleteComment: jest.fn(), editComment: jest.fn(), notifyMentions: jest.fn(), resolveComment: jest.fn() }));

import { listSpaceThreads } from "../comments";

const dropped = { data: null, error: { message: "", code: "" } };
let logged: jest.SpyInstance;
beforeEach(() => {
  rpc.mockReset();
  logged = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => logged.mockRestore());

it("a read the person moved on from fails silently", async () => {
  rpc.mockResolvedValue(dropped);
  await expect(listSpaceThreads("s1", () => true)).resolves.toEqual([]);
  expect(logged).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("a dropped connection on a page still shown is tried once more, and the answer is used", async () => {
  rpc.mockResolvedValueOnce(dropped).mockResolvedValueOnce({ data: [], error: null });
  await expect(listSpaceThreads("s1")).resolves.toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(2);
  expect(logged).not.toHaveBeenCalled();
});

it("a real refusal is still reported", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "permission denied for table x", code: "42501" } });
  await expect(listSpaceThreads("s1")).rejects.toThrow();
  expect(logged).toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledTimes(1);
});
