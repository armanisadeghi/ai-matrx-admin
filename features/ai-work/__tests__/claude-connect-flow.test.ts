/**
 * FORCING GUARD — Connect must always end. Arman, 2026-10-10: the sign-in POST
 * died with "Failed to fetch" and the readiness GET timed out, and the panel
 * spun on. Every wait here has an end: a call that never answers, a network
 * failure, a Cancel mid-call, a sandbox that never comes up. Only the injected
 * effects are fake; the state machine is real.
 */

import {
  coldStartWords,
  NO_TIMING_MESSAGE,
  OFFLINE_MESSAGE,
  phaseWords,
  runClaudeConnect,
  sandboxTimeoutMessage,
  type ConnectDeps,
  type ConnectReadiness,
} from "@/features/ai-work/lib/claudeConnectFlow";
import type { OwnPlanStatus } from "@/features/ai-work/lib/ownPlan";

/** The server's start-then-poll answer while the sandbox boots. */
const starting = {
  provider: "claude_code",
  state: "starting",
  signed_in: false,
  detail: "Starting your coding sandbox. A cold start takes up to about 4 minutes.",
  cold_start_expected_seconds: 240,
  ready_wait_seconds: 360,
} as unknown as OwnPlanStatus;
/** The same answer with another ready-wait knob (seconds). */
const startingWithWait = (wait: number, expected = 240) =>
  ({ ...starting, cold_start_expected_seconds: expected, ready_wait_seconds: wait }) as unknown as OwnPlanStatus;
const link: OwnPlanStatus = {
  provider: "claude_code",
  state: "awaiting_code",
  signed_in: false,
  sign_in_url: "https://claude.ai/oauth/x",
};
const NEVER = "never" as const;
const offline = () => new TypeError("Failed to fetch");

type Step<T> = T | Error | typeof NEVER;

function harness(opts: {
  starts: Array<Step<OwnPlanStatus>>;
  readiness?: Array<Step<ConnectReadiness>>;
}) {
  const controller = new AbortController();
  let clock = 0;
  const starts = [...opts.starts];
  const reads = [...(opts.readiness ?? [])];
  const play = async <T,>(next: Step<T> | undefined, fallback: T): Promise<T> => {
    const step = next === undefined ? fallback : next;
    if (step === NEVER) return new Promise<T>(() => {});
    if (step instanceof Error) throw step;
    return step;
  };
  const deps: ConnectDeps = {
    start: jest.fn(() => {
      if (starts.length === 0) throw new Error("unexpected start");
      return play(starts.shift(), link);
    }),
    readiness: jest.fn(() => play(reads.shift(), { state: "provisionable" as const })),
    isFatal: (c) => c instanceof Error && c.message === "capacity",
    isNetwork: (c) => c instanceof TypeError,
    describe: (c) => (c instanceof Error ? c.message : "error"),
    sleep: jest.fn(async (ms: number) => {
      clock += ms;
    }),
    now: () => clock,
    signal: controller.signal,
    callTimeoutMs: 30,
  };
  return { deps, controller };
}

describe("runClaudeConnect", () => {
  it("cold box: the server says starting, the flow polls until ready, then gets the link", async () => {
    const h = harness({
      starts: [starting, link],
      readiness: [{ state: "provisionable" }, { state: "ready" }],
    });
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "awaiting", status: link });
    expect(h.deps.readiness).toHaveBeenCalledTimes(2);
    expect(h.deps.start).toHaveBeenCalledTimes(2);
  });

  it("warm box: one call, no polling", async () => {
    const h = harness({ starts: [link] });
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "awaiting", status: link });
    expect(h.deps.readiness).not.toHaveBeenCalled();
  });

  it("a start that never answers is bounded — never an endless spinner", async () => {
    const h = harness({ starts: [NEVER, NEVER, NEVER], readiness: [NEVER, NEVER, NEVER] });
    const out = await runClaudeConnect(h.deps);
    expect(out).toEqual({ kind: "offline", message: OFFLINE_MESSAGE });
  });

  it("'Failed to fetch' is shown as unreachable, not waited on until the deadline", async () => {
    const h = harness({
      starts: [offline()],
      readiness: [offline(), offline()],
    });
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "offline", message: OFFLINE_MESSAGE });
  });

  it("one network blip is ridden out", async () => {
    const h = harness({
      starts: [offline(), link],
      readiness: [{ state: "ready" }],
    });
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "awaiting", status: link });
  });

  it("Cancel ends the flow at once, even while a call is in flight", async () => {
    const h = harness({ starts: [NEVER] });
    const pending = runClaudeConnect(h.deps);
    h.controller.abort();
    expect(await pending).toEqual({ kind: "cancelled" });
  });

  it("cancel during the wait stops polling", async () => {
    const h = harness({ starts: [starting] });
    (h.deps.sleep as jest.Mock).mockImplementation(async () => h.controller.abort());
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "cancelled" });
    expect(h.deps.readiness).not.toHaveBeenCalled();
  });

  it("a sandbox that never comes up ends in an honest timeout", async () => {
    const h = harness({ starts: [startingWithWait(20)] });
    expect(await runClaudeConnect(h.deps)).toEqual({
      kind: "timeout",
      message: sandboxTimeoutMessage({ expectedSeconds: 240, waitSeconds: 20 }),
    });
  });

  it("a server refusal on start fails at once with its own sentence", async () => {
    const h = harness({ starts: [new Error("Your sandbox would not start.")] });
    expect(await runClaudeConnect(h.deps)).toEqual({
      kind: "failed",
      message: "Your sandbox would not start.",
    });
  });

  it("ready twice without a link is a failure with the reason", async () => {
    const h = harness({
      starts: [starting, starting, starting],
      readiness: [{ state: "ready" }, { state: "ready" }],
    });
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "failed", message: starting.detail });
  });

  it("readiness 'unavailable' fails with its own reason", async () => {
    const h = harness({
      starts: [starting],
      readiness: [{ state: "unavailable", reason: "No sandbox host is configured." }],
    });
    expect(await runClaudeConnect(h.deps)).toEqual({
      kind: "failed",
      message: "No sandbox host is configured.",
    });
  });

  it("fatal errors (capacity) propagate untouched", async () => {
    const h = harness({ starts: [new Error("capacity")] });
    await expect(runClaudeConnect(h.deps)).rejects.toThrow("capacity");
  });

  it("signed in on the first call settles immediately", async () => {
    const done: OwnPlanStatus = { ...link, state: "signed_in", signed_in: true, sign_in_url: null };
    const h = harness({ starts: [done] });
    expect((await runClaudeConnect(h.deps)).kind).toBe("signed_in");
  });

  /**
   * FORCING GUARD — Arman, 2026-10-21: his sandbox took 3 min 42 s from create to ready
   * (sbx-efe54f2726a4, 16:09:20 → 16:13:02 UTC) and the old 3-minute cut gave up on it. A real
   * cold start must end with the link, and the screen must be told each step as it happens.
   */
  it("a 3 min 42 s cold start still ends with the link, and every step is reported", async () => {
    const h = harness({ starts: [starting, link] });
    let clock = 0;
    h.deps.now = () => clock;
    h.deps.sleep = jest.fn(async (ms: number) => {
      clock += ms;
    });
    h.deps.readiness = jest.fn(async () =>
      clock < 150_000
        ? { state: "provisionable" as const, box_status: "creating" }
        : clock < 222_000
          ? { state: "provisionable" as const, box_status: "running", reason: "app not answering yet" }
          : { state: "ready" as const, box_status: "ready" },
    );
    const phases: string[] = [];
    h.deps.onPhase = (phase) => phases.push(phase);
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "awaiting", status: link });
    expect(phases).toEqual(["sandbox", "app", "link"]);
  });

  /**
   * FORCING GUARD — 2026-10-21 review: the 4-minute expectation and 6-minute deadline were typed
   * in both repos. The deadline and every "how long" sentence now come from the server's knobs
   * (coding_session_bridge.hosted_box_cold_start_expected_seconds / .hosted_box_ready_wait_seconds),
   * sent with the starting and readiness answers; changing the row changes the screen.
   */
  it("the deadline is the server's ready-wait knob, not a client constant", async () => {
    const run = async (wait: number) => {
      const h = harness({ starts: [startingWithWait(wait), link] });
      let clock = 0;
      h.deps.now = () => clock;
      h.deps.sleep = jest.fn(async (ms: number) => {
        clock += ms;
      });
      h.deps.readiness = jest.fn(async () => (clock < 400_000 ? { state: "provisionable" as const, box_status: "creating" } : { state: "ready" as const, box_status: "ready" }));
      return runClaudeConnect(h.deps);
    };
    // A 400 s cold start: within a 7-minute knob it links; under a 5-minute knob it times out, saying 5.
    expect(await run(420)).toEqual({ kind: "awaiting", status: link });
    const short = await run(300);
    expect(short).toEqual({ kind: "timeout", message: sandboxTimeoutMessage({ expectedSeconds: 240, waitSeconds: 300 }) });
    expect(short.kind === "timeout" && short.message).toContain("within 5 minutes");
  });

  it("the screen is told the server's timing once, and builds its words from it", async () => {
    const h = harness({ starts: [startingWithWait(360, 300), link], readiness: [{ state: "ready" }] });
    const seen: unknown[] = [];
    h.deps.onTiming = (t) => seen.push(t);
    await runClaudeConnect(h.deps);
    expect(seen).toEqual([{ expectedSeconds: 300, waitSeconds: 360 }]);
    expect(coldStartWords({ expectedSeconds: 300, waitSeconds: 360 })).toBe("A cold start takes up to about 5 minutes.");
  });

  it("a server that never says its timing is told plainly, never waited on blind", async () => {
    const bare = { ...starting, cold_start_expected_seconds: undefined, ready_wait_seconds: undefined } as unknown as OwnPlanStatus;
    const h = harness({ starts: [bare], readiness: [{ state: "provisionable" }] });
    expect(await runClaudeConnect(h.deps)).toEqual({ kind: "failed", message: NO_TIMING_MESSAGE });
  });

  /** 2026-10-21 review: "Step 1 of 3" was a guess; box_status only tells creating from up. */
  it("phase words say only what the server reports, with no invented step count", () => {
    for (const phase of ["sandbox", "app", "link"] as const) expect(phaseWords(phase)).not.toMatch(/step \d/i);
    expect(phaseWords("app")).toBe("Sandbox is up; its app is starting");
  });
});
