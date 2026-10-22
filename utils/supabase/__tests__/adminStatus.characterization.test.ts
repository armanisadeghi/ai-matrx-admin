/**
 * Characterization of the website's two admin reads (2026-10-21): recorded green against the
 * hand-rolled `admin.admins` queries, then kept green after both moved onto
 * `readAdminStatus` from `@ai-matrx/auth/admin`. Every answer, log line and throw is pinned.
 *
 *   getAdminStatus          (server layouts → userAuthSlice.isAdmin / adminLevel)
 *   readBrowserAdminStatus  (usePublicAuthSync, a browser-only sign-in the server did not seed)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
  supabase: {},
}));

import { getAdminStatus } from "@/utils/supabase/userSessionData";
import { readBrowserAdminStatus } from "@/hooks/usePublicAuthSync";

type Fact =
  | { kind: "row"; level?: string }
  | { kind: "none" }
  | { kind: "error"; error: { message: string; code?: string } }
  | { kind: "throws"; error: Error };

const UID = "4cf62e4e-2679-484f-b652-34e4b5b0b6e7";

function fakeClient(fact: Fact) {
  const calls: string[] = [];
  const client = {
    schema: (s: string) => {
      calls.push(`schema:${s}`);
      return {
        from: (t: string) => {
          calls.push(`from:${t}`);
          return {
            select: (cols: string) => {
              calls.push(`select:${cols}`);
              return {
                eq: (c: string, v: string) => {
                  calls.push(`eq:${c}=${v}`);
                  return {
                    maybeSingle: async () => {
                      calls.push("maybeSingle");
                      if (fact.kind === "throws") throw fact.error;
                      if (fact.kind === "error") return { data: null, error: fact.error };
                      if (fact.kind === "none") return { data: null, error: null };
                      const row: Record<string, unknown> = { user_id: UID };
                      if (fact.level !== undefined) row.level = fact.level;
                      return { data: row, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const READ = ["schema:admin", "from:admins", "select:user_id, level", `eq:user_id=${UID}`, "maybeSingle"];

let errorSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

describe("getAdminStatus", () => {
  it("reads the person's own admin.admins row once", async () => {
    const { client, calls } = fakeClient({ kind: "none" });
    await getAdminStatus(client, UID);
    expect(calls).toEqual(READ);
  });

  it.each(["super_admin", "senior_admin", "developer"])("a %s row is admin with that level", async (level) => {
    const { client } = fakeClient({ kind: "row", level });
    expect(await getAdminStatus(client, UID)).toEqual({ isAdmin: true, level });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("a row with no level is admin, level null", async () => {
    const { client } = fakeClient({ kind: "row" });
    expect(await getAdminStatus(client, UID)).toEqual({ isAdmin: true, level: null });
  });

  it("no row (or a signed-out client) is not admin", async () => {
    const { client } = fakeClient({ kind: "none" });
    expect(await getAdminStatus(client, UID)).toEqual({ isAdmin: false, level: null });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("an error answer is not admin and logs the error once", async () => {
    const error = { message: "JWT expired", code: "PGRST301" };
    const { client } = fakeClient({ kind: "error", error });
    expect(await getAdminStatus(client, UID)).toEqual({ isAdmin: false, level: null });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("Error checking admin status:", error);
  });

  it("a thrown failure rejects to the caller", async () => {
    const { client } = fakeClient({ kind: "throws", error: new TypeError("Failed to fetch") });
    await expect(getAdminStatus(client, UID)).rejects.toThrow("Failed to fetch");
  });
});

describe("readBrowserAdminStatus (usePublicAuthSync)", () => {
  it("reads the person's own admin.admins row once", async () => {
    const { client, calls } = fakeClient({ kind: "none" });
    await readBrowserAdminStatus(client, UID);
    expect(calls).toEqual(READ);
  });

  it("a row is admin with its level", async () => {
    const { client } = fakeClient({ kind: "row", level: "super_admin" });
    expect(await readBrowserAdminStatus(client, UID)).toEqual({ isAdmin: true, adminLevel: "super_admin" });
  });

  it("no row is not admin", async () => {
    const { client } = fakeClient({ kind: "none" });
    expect(await readBrowserAdminStatus(client, UID)).toEqual({ isAdmin: false, adminLevel: null });
  });

  it("an error answer is not admin, silently", async () => {
    const { client } = fakeClient({ kind: "error", error: { message: "denied" } });
    expect(await readBrowserAdminStatus(client, UID)).toEqual({ isAdmin: false, adminLevel: null });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("a thrown failure is not admin and warns once", async () => {
    const thrown = new TypeError("Failed to fetch");
    const { client } = fakeClient({ kind: "throws", error: thrown });
    expect(await readBrowserAdminStatus(client, UID)).toEqual({ isAdmin: false, adminLevel: null });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[usePublicAuthSync] admin status could not be read; proceeding as non-admin.",
      thrown,
    );
  });
});
