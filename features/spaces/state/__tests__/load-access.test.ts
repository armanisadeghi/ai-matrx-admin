/**
 * A refused tree read is a sign-in / no-access state, never database text in the sidebar.
 * readAllRows flattens PostgREST's error into a sentence and drops `.code`, so the refusal must be
 * recognised from that sentence as well as from a 42501 code.
 */
let mockSession: object | null = null;
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: mockSession } }) } }),
}));
import { isRefusal, readWhenSignedIn } from "../load-access";

describe("readWhenSignedIn", () => {
  it("makes no read for a signed-out visitor (it would be a 401)", async () => {
    mockSession = null;
    const read = jest.fn(async () => ["page"]);
    await expect(readWhenSignedIn(read)).resolves.toEqual({ kind: "signed-out" });
    expect(read).not.toHaveBeenCalled();
  });
  it("reads for a signed-in tab", async () => {
    mockSession = { user: { id: "u" } };
    const read = jest.fn(async () => ["page"]);
    await expect(readWhenSignedIn(read)).resolves.toEqual({ kind: "read", value: ["page"] });
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("isRefusal", () => {
  it("reads the sentence readAllRows leaves for a refused space_list", () => {
    expect(isRefusal(new Error("readAllRows(content.space_list): query failed — permission denied for function space_list"))).toBe(true);
  });
  it("reads a PostgREST 42501", () => {
    expect(isRefusal({ code: "42501", message: "nope" })).toBe(true);
  });
  it("leaves a real fault a fault", () => {
    expect(isRefusal(new Error("readAllRows(content.space_list): query failed — TypeError: Failed to fetch"))).toBe(false);
  });
});
