/**
 * FORCING TESTS for the /work coding doors (`matrx2Coding.ts`): Matrx 2 first, Matrx Local only
 * when no Matrx 2 computer answers, and every refusal a sentence. The live proof of the same module
 * against a real computer is matrx-desktop `test/live/web-coding-doors-live.test.ts`.
 * Every expected sentence is typed by hand.
 */
import {
  FALLBACK_ORDER,
  chooseComputer,
  cloudSessionFilter,
  continueTarget,
  createMatrx2Reach,
  fileMatrx2Run,
  nativeSessionId,
  resumePendingFilings,
  type PendingFiling,
  readCodingCapability,
  readContinueVerdict,
  type CodingDoors,
  type Matrx2ComputerStatus,
} from "../matrx2Coding";

const mac = (over: Partial<Matrx2ComputerStatus> = {}): Matrx2ComputerStatus => ({
  deviceId: "d1",
  name: "Studio Mac",
  online: true,
  protocolVersion: "1.40",
  ...over,
});

function doors(statuses: Matrx2ComputerStatus[], work: (op: string) => unknown = () => { throw new Error("DEVICE_OFFLINE"); }): CodingDoors & { localCalls: string[] } {
  const localCalls: string[] = [];
  const unreachable = { state: "unreachable" as const, available: false, reasons: ["Matrx Local did not answer."], claudeCli: null, claudeAccountLabel: null, workspaceRoots: [], approvedFolders: [], activeRuns: 0 };
  return {
    localCalls,
    reach: {
      listComputers: async (id) => (id ? statuses.filter((s) => s.deviceId === id) : statuses),
      withClient: async (_c, fn) =>
        fn({
          request: async (op: string) => work(op),
          stream: () => { throw new Error("no stream"); },
          on: () => () => undefined,
          getState: () => ({ status: "ready", welcome: { protocol_version: "1.40" }, lastError: null }),
          subscribe: () => () => undefined,
        } as never),
      findConversation: async () => null,
    },
    local: {
      capability: async () => (localCalls.push("capability"), unreachable),
      start: async () => { throw new Error("no"); },
      resumable: async () => { localCalls.push("resumable"); throw new Error("Matrx Local did not answer."); },
      reconcile: async () => { throw new Error("no"); },
    },
  };
}

describe("which computer runs it", () => {
  it("is one constant order: Matrx 2, then Matrx Local", () => {
    expect(FALLBACK_ORDER).toEqual(["matrx2", "matrx-local"]);
  });

  it("names the computer, and says so when several are online (never a silent first pick)", () => {
    expect(chooseComputer([mac()]).notice).toBe("Runs on Studio Mac (Matrx 2).");
    const two = chooseComputer([mac(), mac({ deviceId: "d2", name: "Laptop" })]);
    expect(two.computer).toEqual({ deviceId: "d1", name: "Studio Mac" });
    expect(two.notice).toBe("Runs on Studio Mac, the newest of 2 online.");
  });

  it("uses the page's own computer when it names one", () => {
    const named = chooseComputer([mac(), mac({ deviceId: "d2", name: "Laptop" })], "d2");
    expect(named.computer?.name).toBe("Laptop");
    expect(named.notice).toBe("Runs on Laptop (Matrx 2).");
  });

  // RED WHEN: every disposable or long-gone computer is listed in the fallback line.
  it("names only the two most recent offline computers", () => {
    const pick = chooseComputer(["A", "B", "C", "D"].map((n) => mac({ deviceId: n, name: n, online: false })));
    expect(pick.reasons).toEqual(["A: offline or asleep.", "B: offline or asleep.", "2 more are offline."]);
  });

  it("says why each other computer cannot", () => {
    const pick = chooseComputer([mac({ online: false }), mac({ deviceId: "d2", name: "Old iMac", protocolVersion: "1.30" })]);
    expect(pick.computer).toBeNull();
    expect(pick.reasons).toEqual(["Studio Mac: offline or asleep.", "Old iMac: update Matrx 2 to reach its coding sessions from here."]);
    expect(chooseComputer([]).reasons).toEqual(["No computer runs Matrx 2 on this account."]);
  });

});

describe("THE relay reach (createMatrx2Reach, the browser's and the live proof's)", () => {
  const deps = (over: Partial<Parameters<typeof createMatrx2Reach>[0]> = {}) => ({
    session: async () => ({ token: "t", userId: "u" }),
    devices: async () => ["a", "b", "c", "d", "e"].map((id) => ({ id, name: `PC ${id}` })),
    relayStatus: async (id: string) => ({ online: id !== "b", protocol_version: "1.40" }),
    client: () => {
      throw new Error("no socket in this test");
    },
    conversation: async (_u: string, filter: string) => (filter.includes("chat-1") ? "conv-1" : null),
    ...over,
  });

  // RED WHEN: the cap is applied before the page's device filter (the named computer is the fifth).
  it("filters by the page's device before the newest-four cap, and reads only the relay's status", async () => {
    const reach = createMatrx2Reach(deps());
    expect(await reach.listComputers("e")).toEqual([{ deviceId: "e", name: "PC e", online: true, protocolVersion: "1.40" }]);
    const all = await reach.listComputers();
    expect(Array.isArray(all) && all.map((c) => [c.deviceId, c.online])).toEqual([["a", true], ["b", false], ["c", true], ["d", true]]);
  });

  // RED WHEN: a failed device query reads as "no computer runs Matrx 2".
  it("says why the computers could not be listed", async () => {
    const reach = createMatrx2Reach(deps({ devices: async () => { throw new Error("JWT expired"); } }));
    expect(await reach.listComputers()).toEqual({ reason: "Your computers could not be listed: JWT expired" });
    expect(await createMatrx2Reach(deps({ session: async () => null })).listComputers()).toEqual({ reason: "Sign in to reach your computers." });
  });

  it("refuses a computer below the coding protocol, and closes the socket either way", async () => {
    let closed = 0;
    const reach = createMatrx2Reach(
      deps({ client: () => ({ connect: () => undefined, ready: async () => ({ protocol_version: "1.30" }), close: () => void (closed += 1) }) as never }),
    );
    await expect(reach.withClient({ deviceId: "a", name: "PC a" }, async () => "ran")).rejects.toThrow("update Matrx 2");
    expect(closed).toBe(1);
  });

  it("finds the AI Matrx conversation by the chat's cloud filter", async () => {
    expect(await createMatrx2Reach(deps()).findConversation("chat-1")).toBe("conv-1");
  });
});

describe("continue: which chat, or why not", () => {
  const chat = { provider: "claude", providerSessionId: "c1", cwd: "/w", title: "t", updatedAt: "", source: null, activeElsewhere: null } as never;
  it("goes straight to a session the computer already drives", () => {
    expect(continueTarget("Studio Mac", "c1", [{ id: "s9", providerSessionId: "c1", cwd: "/w" } as never], [])).toEqual({ state: "ready", cwd: "/w", ownSessionId: "s9", elsewhere: null });
  });
  it("names a chat outside the window, never 'not found'", () => {
    expect(continueTarget("Studio Mac", "zz", [], [chat], 200)).toEqual({ state: "blocked", sentence: "This chat is not among the newest 200 chats on Studio Mac." });
  });
  it("says so when the computer has no folder for it", () => {
    expect(continueTarget("Studio Mac", "c1", [], [{ ...(chat as object), cwd: null } as never])).toEqual({ state: "blocked", sentence: "Studio Mac has no record of the folder this chat worked in, so it cannot continue there." });
  });
  it("carries the live-elsewhere warning for the confirm step", () => {
    const elsewhere = { reason: "process", message: "Claude Code is running this chat in Terminal." };
    expect(continueTarget("Studio Mac", "c1", [], [{ ...(chat as object), activeElsewhere: elsewhere } as never])).toMatchObject({ state: "ready", elsewhere });
  });
});

describe("the cloud join", () => {
  it("reads the bare chat id out of the imported form", () => {
    const id = "11111111-2222-4333-8444-000000012345";
    const encoded = Buffer.from(id).toString("base64url");
    expect(nativeSessionId(`claude-sdk:proj:${encoded}`)).toBe(id);
    expect(nativeSessionId(id)).toBe(id);
    expect(cloudSessionFilter(id)).toBe(`provider_session_id.eq.${id},provider_session_id.like.*:${encoded}`);
  });
});

describe("the fallback is announced, never silent", () => {
  // RED WHEN: the door goes to Matrx Local while a Matrx 2 computer answered.
  it("a Matrx 2 computer that answers is used, and Matrx Local is not asked", async () => {
    const d = doors([mac()], (op) => (op === "coding.providers" ? { providers: [{ provider: "claude", label: "Claude Code", installed: true, version: "2.1", loggedIn: true, billing: "subscription", plan: null, account: "me@x.com", problem: null, fix: null, ready: true, lastProblem: null, quota: [] }] } : { folders: [{ path: "/w", lastUsedAt: "", exists: true }] }));
    const cap = await readCodingCapability(d);
    expect(cap).toMatchObject({ via: "matrx2", available: true, approvedFolders: ["/w"], notice: "Runs on Studio Mac (Matrx 2)." });
    expect(d.localCalls).toEqual([]);
  });

  it("no Matrx 2 computer answers: each reason is named, then Matrx Local is tried", async () => {
    const d = doors([mac()]);
    const cap = await readCodingCapability(d);
    expect(cap.via).toBe("matrx-local");
    expect(cap.notice).toBe("No Matrx 2 computer answered: Studio Mac: offline or asleep. Trying Matrx Local.");
    expect(cap.reasons).toEqual(["Studio Mac: offline or asleep.", "Matrx Local did not answer."]);
    expect(await readContinueVerdict(d, "c1")).toEqual({ via: "none", sentence: "Studio Mac: offline or asleep. Matrx Local did not answer." });
    expect(d.localCalls).toEqual(["capability", "resumable"]);
  });
});

describe("continue reaches the computer that holds the chat", () => {
  // RED WHEN: only the newest computer is asked, so a chat on the second reads "not among the newest".
  it("asks each online computer, the chat's holder wins", async () => {
    const statuses = [mac(), mac({ deviceId: "d2", name: "Laptop" })];
    const d = doors(statuses);
    d.reach.withClient = async (computer, fn) =>
      fn({
        request: async (op: string) =>
          op === "coding.sessions.list"
            ? { sessions: [], runs: {}, recent: [], title_status: { state: "ready" } }
            : { chats: computer.deviceId === "d2" ? [{ provider: "claude", providerSessionId: "c1", cwd: "/w", title: "t", updatedAt: "2026-10-14T00:00:00Z", source: null, activeElsewhere: null }] : [] },
        stream: () => ({}),
        on: () => () => undefined,
        getState: () => ({ status: "ready", welcome: { protocol_version: "1.40" }, lastError: null }),
        subscribe: () => () => undefined,
      } as never);
    const verdict = await readContinueVerdict(d, "c1");
    expect(verdict).toMatchObject({ via: "matrx2", computer: { deviceId: "d2", name: "Laptop" }, notice: "Runs on Laptop, which holds this chat.", target: { state: "ready", cwd: "/w" } });
    const missing = await readContinueVerdict(d, "zz");
    expect(missing).toMatchObject({ via: "matrx2", target: { state: "blocked", sentence: "This chat is not among the newest 200 chats on Studio Mac or Laptop." } });
    expect(d.localCalls).toEqual([]);
  });
});

describe("filing a start survives the tab, and never delivers by itself", () => {
  function memoryStore() {
    const rows = new Map<string, PendingFiling>();
    return { rows, list: async () => [...rows.values()], put: async (f: PendingFiling) => void rows.set(f.sessionId, f), remove: async (f: PendingFiling) => void rows.delete(f.sessionId) };
  }

  // RED WHEN: filing runs coding.reconcile (every chat on the computer) without the person asking.
  it("records a pending filing with its homes, and sends no reconcile", async () => {
    const ops: string[] = [];
    const d = doors([mac()], (op) => {
      ops.push(op);
      return { sessions: [{ id: "s1", providerSessionId: "chat-9", cwd: "/w" }], runs: {}, recent: [], title_status: { state: "ready" } };
    });
    const store = memoryStore();
    d.filings = store;
    const filed = await fileMatrx2Run(d, { deviceId: "d1", name: "Studio Mac" }, "s1", { homes: [{ token: "project", id: "p1" }] });
    expect(filed).toEqual({ pending: "Running on Studio Mac. Filed under your homes once Studio Mac delivers it to AI Matrx." });
    expect(ops).not.toContain("coding.reconcile");
    expect([...store.rows.values()]).toMatchObject([{ sessionId: "s1", providerSessionId: "chat-9", homes: [{ token: "project", id: "p1" }] }]);

    // The next load: the chat reached AI Matrx, so it is filed with its homes and forgotten.
    d.reach.findConversation = async (id) => (id === "chat-9" ? "conv-9" : null);
    const attached: Array<[string, unknown[]]> = [];
    const waiting = await resumePendingFilings(d, async (conversationId, filing) => void attached.push([conversationId, filing.homes]));
    expect(attached).toEqual([["conv-9", [{ token: "project", id: "p1" }]]]);
    expect(waiting).toEqual([]);
    expect(store.rows.size).toBe(0);
  });
});
