/**
 * Review 2026-10-21, finding 1: a killed start left an account permanently "searched, found nothing". The run starts
 * FIRST and the state is written after, and "started on record with no run" is never "found nothing".
 *
 * Real code: startFoundSearchWith, foundSearchState/foundSearchNext, checkFoundSearch. Stand-ins: the network edges.
 */
import type { User } from "@supabase/supabase-js";
import { foundSearchNext, type FoundSearchState } from "../foundSearchState";
import { startFoundSearchWith, type FoundSearchStartDeps } from "../foundSearchStart";
import { roundSubject, welcomeSubject } from "../welcomeSession";

function user(meta: Record<string, unknown> = {}): User {
  return {
    id: "u1",
    aud: "authenticated",
    app_metadata: {},
    created_at: "2026-10-20T00:00:00Z",
    email: "dana.reyes@gmail.com",
    email_confirmed_at: "2026-10-20T00:00:00Z",
    user_metadata: { full_name: "Dana Reyes", ...meta },
    identities: [{ id: "i0", user_id: "u1", identity_id: "i0", provider: "email", identity_data: {} }],
  } as User;
}

function deps(account: User, over: Partial<FoundSearchStartDeps> = {}) {
  const log: string[] = [];
  const d: FoundSearchStartDeps = {
    freshUser: async () => account,
    rules: async () => [],
    organizationId: async () => "org-1",
    writeState: async (patch: Partial<FoundSearchState>) => {
      log.push(`write:${patch.startedAt === null ? "cleared" : "started"}`);
    },
    runExists: async () => false,
    startRun: async ({ subject }) => {
      log.push(`start:${subject}`);
      return { runId: "run-1" };
    },
    ...over,
  };
  return { d, log };
}

describe("the start order: run first, state after", () => {
  it("starts the run before it records the state", async () => {
    const { d, log } = deps(user());
    const r = await startFoundSearchWith(d);
    expect(r.outcome).toBe("started");
    expect(log).toEqual([`start:${roundSubject(welcomeSubject("u1"), 0)}`, "write:started"]);
  });

  it("a start killed before it answers leaves no state: the account is still unstarted, so the next load starts it", async () => {
    const account = user();
    const killed = deps(account, { startRun: async () => Promise.reject(new Error("function killed")) });
    await expect(startFoundSearchWith(killed.d)).rejects.toThrow("function killed");
    expect(killed.log).toEqual([]); // nothing written, nothing to roll back
    expect(foundSearchNext(account)).toBe("start");
    const next = deps(account);
    expect((await startFoundSearchWith(next.d)).outcome).toBe("started");
  });

  it("a death between the start and the write leaves a run and no state: the next start asks for the SAME subject", async () => {
    const account = user();
    const subjects: string[] = [];
    const startRun: FoundSearchStartDeps["startRun"] = async ({ subject }) => {
      subjects.push(subject);
      return { runId: "run-1" };
    };
    const dies = deps(account, { startRun, writeState: async () => Promise.reject(new Error("killed after start")) });
    await expect(startFoundSearchWith(dies.d)).rejects.toThrow("killed after start");
    expect(foundSearchNext(account)).toBe("start");
    await startFoundSearchWith(deps(account, { startRun }).d);
    expect(subjects).toHaveLength(2);
    expect(subjects[1]).toBe(subjects[0]); // the idempotent key: aidream hands back the active run
  });

  it("started on record but no run exists: asUnstarted starts the first round again", async () => {
    const account = user({ found_search_started_at: "2026-10-20T00:00:01Z", found_search_round: 0, found_search_basis: ["name:dana reyes"] });
    const { d, log } = deps(account);
    const r = await startFoundSearchWith(d, {}, { asUnstarted: true });
    expect(r).toMatchObject({ outcome: "started", round: 0 });
    expect(log[0]).toBe(`start:${roundSubject(welcomeSubject("u1"), 0)}`);
  });
});

describe("checkFoundSearch: started with no run is not 'found nothing'", () => {
  const writes: Record<string, unknown>[] = [];
  const startSystemRun = jest.fn(async (..._args: unknown[]) => ({ runId: "run-9" }));
  let account: User;

  beforeEach(() => {
    jest.resetModules();
    writes.length = 0;
    startSystemRun.mockClear();
    account = user({ found_search_started_at: "2026-10-20T00:00:01Z", found_search_round: 0 });
    jest.doMock("@/utils/supabase/client", () => ({
      supabase: {
        auth: {
          getUser: async () => ({ data: { user: account }, error: null }),
          updateUser: async (arg: { data: Record<string, unknown> }) => {
            writes.push(arg.data);
            return { error: null };
          },
        },
        schema: () => ({ rpc: async () => ({ error: null }) }),
      },
    }));
    jest.doMock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => ({ dispatch: () => undefined }) }));
    jest.doMock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org-1" }));
    jest.doMock("@/lib/web-domains/service", () => ({ fetchKnownDomainRules: async () => [] }));
    jest.doMock("@/lib/python-client", () => ({ getJson: async () => ({ data: {} }) }));
    jest.doMock("@/lib/workflows/system-runs", () => ({ lookupSystemRun: async () => null, startSystemRun }));
  });

  it("starts the first round again, keeps watching, and never records 'checked: nothing'", async () => {
    const { checkFoundSearch } = await import("../foundSearchBackground");
    expect(await checkFoundSearch()).toBe("running");
    expect(startSystemRun).toHaveBeenCalledTimes(1);
    expect(startSystemRun.mock.calls[0][2]).toMatchObject({ subject: roundSubject(welcomeSubject("u1"), 0), organizationId: "org-1" });
    expect(writes.some((w) => "found_search_checked_at" in w && w.found_search_checked_at !== null)).toBe(false);
  });
});
