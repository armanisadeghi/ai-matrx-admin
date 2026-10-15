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
  nativeSessionId,
  readCodingCapability,
  readContinueVerdict,
  type CodingDoors,
  type Matrx2ComputerStatus,
} from "../matrx2Coding";
import { onlyDevice } from "../matrx2Computers";

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
    expect(two.notice).toBe("Runs on Studio Mac: 2 of your computers run Matrx 2, and this is the most recent.");
  });

  it("uses the page's own computer when it names one", () => {
    const named = chooseComputer([mac(), mac({ deviceId: "d2", name: "Laptop" })], "d2");
    expect(named.computer?.name).toBe("Laptop");
    expect(named.notice).toBe("Runs on Laptop (Matrx 2).");
  });

  it("says why each other computer cannot", () => {
    const pick = chooseComputer([mac({ online: false }), mac({ deviceId: "d2", name: "Old iMac", protocolVersion: "1.30" })]);
    expect(pick.computer).toBeNull();
    expect(pick.reasons).toEqual(["Studio Mac: offline or asleep.", "Old iMac: update Matrx 2 to reach its coding sessions from here."]);
    expect(chooseComputer([]).reasons).toEqual(["No computer runs Matrx 2 on this account."]);
  });

  // RED WHEN: the cap is applied before the page's device filter (the named computer is the 5th).
  it("filters by the page's device before the newest-four cap", () => {
    const rows = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    expect(onlyDevice(rows, "e")).toEqual([{ id: "e" }]);
    expect(onlyDevice(rows)).toHaveLength(4);
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
    expect(cap.notice).toBe("No Matrx 2 computer answered (Studio Mac: offline or asleep.). Trying Matrx Local.");
    expect(cap.reasons).toEqual(["Studio Mac: offline or asleep.", "Matrx Local did not answer."]);
    expect(await readContinueVerdict(d, "c1")).toEqual({ via: "none", sentence: "Studio Mac: offline or asleep. Matrx Local did not answer." });
    expect(d.localCalls).toEqual(["capability", "resumable"]);
  });
});
