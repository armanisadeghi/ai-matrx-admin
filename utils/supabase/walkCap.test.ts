/** @jest-environment node */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  WALK_CAP_HEADER,
  WALK_BUSY_PROTECT_MS,
  createWalkKnobReader,
  decideWalkAdmission,
  heldPreviewHosts,
  walkCapDevEndpoint,
  walkCapGateForRequest,
  scheduleWalkIdleExpiryForTest,
  setWalkCapTestState,
  walkCapGate,
  type WalkRegistry,
  type WalkKnobs,
  type MemorySnapshot,
  type MemoryVerdict,
  burstHosts,
  judgeMemory,
  parseMemorySnapshot,
  shedForMemory,
  MEMORY_STALE_MS,
} from "./walkCap";

const MIN = 60_000;
const KNOBS: WalkKnobs = { cap: 4, windowMinutes: 10 };
const T0 = 1_800_000_000_000;

function registryWith(entries: Array<[string, number]>): WalkRegistry {
  return { admitted: new Map<string, number>(entries), evicted: new Set<string>() };
}

describe("decideWalkAdmission — the live-database walk cap", () => {
  it("admits a new host while under the cap and records it", () => {
    const registry = registryWith([["a.localhost:3001", T0]]);
    const decision = decideWalkAdmission(registry, "b.localhost:3001", T0, KNOBS);
    expect(decision.verdict).toBe("admit");
    expect(decision.verdict === "admit" && decision.newlyAdmitted).toBe(true);
    expect(registry.admitted.has("b.localhost:3001")).toBe(true);
  });

  it("at the cap evicts the exact least-recently-used host and admits a new one", () => {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 1 * MIN],
      ["b.localhost:3001", T0 - 2 * MIN],
      ["c.localhost:3001", T0 - 3 * MIN],
      ["d.localhost:3001", T0 - 4 * MIN],
    ]);
    const decision = decideWalkAdmission(registry, "e.localhost:3001", T0, KNOBS);
    expect(decision.verdict).toBe("admit");
    expect(decision.active.map((w) => w.host)).toEqual([
      "e.localhost:3001",
      "a.localhost:3001",
      "b.localhost:3001",
      "c.localhost:3001",
    ]);
    expect(decision.active[3].idleMs).toBe(3 * MIN);
    expect(decision.evicted).toEqual(["d.localhost:3001"]);
    expect(registry.evicted.has("d.localhost:3001")).toBe(true);
    expect(registry.admitted.has("e.localhost:3001")).toBe(true);
  });

  it("breaks equal LRU timestamps by insertion order", () => {
    const registry = registryWith([
      ["first.localhost:3001", T0 - 5 * MIN],
      ["second.localhost:3001", T0 - 5 * MIN],
      ["third.localhost:3001", T0 - 5 * MIN],
      ["fourth.localhost:3001", T0 - 5 * MIN],
    ]);
    const decision = decideWalkAdmission(registry, "new.localhost:3001", T0, KNOBS);
    expect(decision.evicted).toEqual(["first.localhost:3001"]);
  });

  it("a host that made any request in the busy window is never evicted; the newcomer is refused instead", () => {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 5 * MIN],
      ["b.localhost:3001", T0 - 5 * MIN],
      ["c.localhost:3001", T0 - 5 * MIN],
      ["d.localhost:3001", T0 - 5 * MIN],
    ]);
    // Four sessions all keep working: only background traffic or a click, seconds apart.
    for (const host of ["a", "b", "c", "d"]) {
      decideWalkAdmission(registry, `${host}.localhost:3001`, T0, KNOBS, host === "a" ? "activity" : "background");
    }
    const decision = decideWalkAdmission(registry, "e.localhost:3001", T0 + 30_000, KNOBS);
    expect(decision.verdict).toBe("refuse");
    expect(decision.evicted).toEqual([]);
    expect(registry.evicted.size).toBe(0);
    expect(registry.admitted.has("e.localhost:3001")).toBe(false);
    // Once they have been quiet past the busy window, the oldest is evicted for the newcomer again.
    const later = decideWalkAdmission(registry, "e.localhost:3001", T0 + WALK_BUSY_PROTECT_MS + 1, KNOBS);
    expect(later.verdict).toBe("admit");
    expect(later.evicted).toEqual(["b.localhost:3001"]);
  });

  it("with 7 sessions all active on 4 slots nobody active is ever parked (the ping-pong)", () => {
    const registry = registryWith([]);
    const hosts = ["a", "b", "c", "d", "e", "f", "g"].map((h) => `${h}.localhost:3001`);
    let now = T0;
    for (const host of hosts) decideWalkAdmission(registry, host, now, KNOBS); // first four admitted, the rest refused
    const parkedEver = new Set<string>();
    for (let tick = 0; tick < 60; tick += 1) {
      now += 5_000;
      for (const host of hosts) {
        const decision = decideWalkAdmission(registry, host, now, KNOBS, "document");
        if (decision.verdict === "parked") parkedEver.add(host);
      }
    }
    expect([...parkedEver]).toEqual([]);
    expect(registry.admitted.size).toBe(4);
  });

  it("an explicit user activity touch keeps a host ahead of background requests", () => {
    const registry = registryWith([
      ["quiet.localhost:3001", T0 - 4 * MIN],
      ["active.localhost:3001", T0 - 3 * MIN],
      ["c.localhost:3001", T0 - 2 * MIN],
      ["d.localhost:3001", T0 - MIN],
    ]);
    decideWalkAdmission(registry, "active.localhost:3001", T0, KNOBS, "activity");
    const decision = decideWalkAdmission(registry, "new.localhost:3001", T0 + MIN, KNOBS);
    expect(decision.evicted).toEqual(["quiet.localhost:3001"]);
  });

  it("lowers a cap by evicting LRU and tombstones evicted hosts against auto reclaim", () => {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 4 * MIN],
      ["b.localhost:3001", T0 - 3 * MIN],
      ["c.localhost:3001", T0 - 2 * MIN],
      ["d.localhost:3001", T0 - MIN],
    ]);
    const decision = decideWalkAdmission(registry, "d.localhost:3001", T0, { cap: 2, windowMinutes: 10 }, "document");
    expect(decision.evicted).toEqual(["a.localhost:3001", "b.localhost:3001"]);
    expect(decideWalkAdmission(registry, "a.localhost:3001", T0 + MIN, KNOBS, "background").verdict).toBe("parked");
  });

  it("at the cap still re-admits a host that is already admitted, refreshing its last-seen", () => {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 1 * MIN],
      ["b.localhost:3001", T0 - 2 * MIN],
      ["c.localhost:3001", T0 - 3 * MIN],
      ["d.localhost:3001", T0 - 9 * MIN],
    ]);
    const decision = decideWalkAdmission(registry, "d.localhost:3001", T0, KNOBS);
    expect(decision.verdict).toBe("admit");
    expect(decision.verdict === "admit" && decision.newlyAdmitted).toBe(false);
    expect(registry.admitted.get("d.localhost:3001")).toBe(T0);
  });

  it("a host idle past the window frees its slot", () => {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 1 * MIN],
      ["b.localhost:3001", T0 - 2 * MIN],
      ["c.localhost:3001", T0 - 3 * MIN],
      ["stale.localhost:3001", T0 - 11 * MIN],
    ]);
    const decision = decideWalkAdmission(registry, "e.localhost:3001", T0, KNOBS);
    expect(decision.verdict).toBe("admit");
    expect(registry.admitted.has("stale.localhost:3001")).toBe(false);
    expect(registry.evicted.has("stale.localhost:3001")).toBe(true);
    expect(registry.admitted.has("e.localhost:3001")).toBe(true);
  });

  it("cap 0 refuses every host, even one seen before", () => {
    const registry = registryWith([["a.localhost:3001", T0 - MIN]]);
    const knobs = { cap: 0, windowMinutes: 10 };
    expect(decideWalkAdmission(registryWith([]), "x.localhost:3001", T0, knobs).verdict).toBe("refuse");
    expect(decideWalkAdmission(registry, "a.localhost:3001", T0, knobs).verdict).toBe("refuse");
  });
});

// HELD HOSTS (2026-10-15): a test run that holds the preview reads pages by script for minutes; it
// was evicted 30 times and refused 52 times in one afternoon's log and landed on "Preview paused".
describe("decideWalkAdmission — a held test run is never paused", () => {
  const HELD = new Set(["runner.localhost"]);

  it("a held host that is still making requests is neither expired nor evicted, however old its last click", () => {
    const registry = registryWith([
      ["runner.localhost:3001", T0 - 60 * MIN],
      ["b.localhost:3001", T0 - 3 * MIN],
      ["c.localhost:3001", T0 - 4 * MIN],
      ["d.localhost:3001", T0 - 5 * MIN],
    ]);
    registry.lastRequest = new Map([["runner.localhost:3001", T0 - MIN]]);
    const decision = decideWalkAdmission(registry, "e.localhost:3001", T0, KNOBS, "document", HELD);
    expect(registry.admitted.has("runner.localhost:3001")).toBe(true);
    expect(registry.evicted.has("runner.localhost:3001")).toBe(false);
    // d (unheld, quiet 5 min) is the one that makes room.
    expect(decision.verdict).toBe("admit");
    expect(registry.evicted.has("d.localhost:3001")).toBe(true);
  });

  it("when held runs fill every slot a newcomer gets the honest refusal, never a held run's slot", () => {
    const held = new Set(["r1.localhost", "r2.localhost", "r3.localhost", "r4.localhost"]);
    const registry = registryWith([
      ["r1.localhost:3001", T0 - 30 * MIN],
      ["r2.localhost:3001", T0 - 30 * MIN],
      ["r3.localhost:3001", T0 - 30 * MIN],
      ["r4.localhost:3001", T0 - 30 * MIN],
    ]);
    registry.lastRequest = new Map(["r1", "r2", "r3", "r4"].map((r) => [`${r}.localhost:3001`, T0 - 2 * MIN] as [string, number]));
    expect(decideWalkAdmission(registry, "x.localhost:3001", T0, KNOBS, "document", held).verdict).toBe("refuse");
    expect(registry.admitted.size).toBe(4);
  });

  it("a held host that was parked earlier is re-admitted by its next signed-in request (the hold is the resume)", () => {
    const registry = registryWith([["b.localhost:3001", T0 - MIN]]);
    registry.evicted.add("runner.localhost:3001");
    expect(decideWalkAdmission(registry, "runner.localhost:3001", T0, KNOBS).verdict).toBe("parked");
    const decision = decideWalkAdmission(registry, "runner.localhost:3001", T0, KNOBS, "document", HELD);
    expect(decision.verdict).toBe("admit");
    expect(registry.evicted.has("runner.localhost:3001")).toBe(false);
  });

  // MKT-174: a hold is up to 180 minutes; a runner that finished leaves it behind. The idle window still rules.
  it("a held host with no request of any kind for the window frees its slot (the hold file outlives the run)", () => {
    const registry = registryWith([
      ["gone.localhost:3001", T0 - 18 * MIN],
      ["b.localhost:3001", T0 - MIN],
      ["c.localhost:3001", T0 - MIN],
      ["d.localhost:3001", T0 - MIN],
    ]);
    registry.lastRequest = new Map([["gone.localhost:3001", T0 - 18 * MIN]]);
    const decision = decideWalkAdmission(registry, "e.localhost:3001", T0, KNOBS, "document", new Set(["gone.localhost"]));
    expect(decision.verdict).toBe("admit");
    expect(registry.admitted.has("gone.localhost:3001")).toBe(false);
    expect(registry.admitted.size).toBe(4);
  });

  it("a held host quiet for more than 5 minutes no longer blocks a newcomer (844 refusals, 2026-10-16)", () => {
    const held = new Set(["r1.localhost", "r2.localhost", "r3.localhost", "r4.localhost"]);
    const registry = registryWith([
      ["r1.localhost:3001", T0 - 30 * MIN],
      ["r2.localhost:3001", T0 - 30 * MIN],
      ["r3.localhost:3001", T0 - 30 * MIN],
      ["r4.localhost:3001", T0 - 30 * MIN],
    ]);
    registry.lastRequest = new Map([
      ["r1.localhost:3001", T0 - 4 * MIN],
      ["r2.localhost:3001", T0 - 4 * MIN],
      ["r3.localhost:3001", T0 - 4 * MIN],
      ["r4.localhost:3001", T0 - 7 * MIN],
    ]);
    const decision = decideWalkAdmission(registry, "x.localhost:3001", T0, KNOBS, "document", held);
    expect(decision.verdict).toBe("admit");
    expect(registry.evicted.has("r4.localhost:3001")).toBe(true);
    expect(registry.admitted.has("r1.localhost:3001")).toBe(true);
  });

  it("the idle timer also expires a held host that went quiet for the window", () => {
    jest.useFakeTimers();
    const dir = mkdtempSync(join(tmpdir(), "walk-holds-timer-"));
    const prev = process.env.MATRX_PREVIEW_STATE_DIR;
    try {
      jest.setSystemTime(T0);
      process.env.MATRX_PREVIEW_STATE_DIR = dir;
      require("node:fs").mkdirSync(join(dir, "holds"));
      writeFileSync(join(dir, "holds", "gone"), `${Math.floor(T0 / 1000) + 3 * 3600} gone\n`);
      const registry = registryWith([["gone.localhost:3001", T0]]);
      setWalkCapTestState({ registry, listeners: new Map(), readKnobs: async () => KNOBS });
      scheduleWalkIdleExpiryForTest(KNOBS);
      jest.advanceTimersByTime(10 * MIN + 2);
      expect(registry.admitted.has("gone.localhost:3001")).toBe(false);
    } finally {
      jest.useRealTimers();
      setWalkCapTestState(undefined);
      if (prev === undefined) delete process.env.MATRX_PREVIEW_STATE_DIR;
      else process.env.MATRX_PREVIEW_STATE_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("without a hold the same quiet runner is expired exactly as before", () => {
    const registry = registryWith([["runner.localhost:3001", T0 - 60 * MIN]]);
    decideWalkAdmission(registry, "e.localhost:3001", T0, KNOBS);
    expect(registry.evicted.has("runner.localhost:3001")).toBe(true);
  });
});

describe("heldPreviewHosts — reads the preview's hold files", () => {
  it("returns live holds as <label>.localhost and ignores expired, malformed and missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "walk-holds-"));
    try {
      const now = 2_000_000_000;
      writeFileSync(join(dir, "runner-a"), `${now + 600} session-a\n`);
      writeFileSync(join(dir, "old"), `${now - 1} session-b\n`);
      writeFileSync(join(dir, "junk"), "not a number\n");
      expect([...heldPreviewHosts(dir, now)]).toEqual(["runner-a.localhost"]);
      expect(heldPreviewHosts(join(dir, "missing"), now).size).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("createWalkKnobReader — one fetch, 60s cache, a missing knob screams", () => {
  const rows = [
    { key: "production_concurrent_cap", value: 4 },
    { key: "activity_window_minutes", value: 10 },
  ];

  function fakeFetch(body: unknown, status = 200) {
    return jest.fn(async () =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
    );
  }

  it("reads both knobs in ONE request and caches them for 60s", async () => {
    let now = T0;
    const fetchImpl = fakeFetch(rows);
    const read = createWalkKnobReader({
      fetchImpl,
      restUrl: "https://db.matrxserver.com",
      apiKey: "k",
      now: () => now,
      log: jest.fn(),
    });
    await expect(Promise.all([read(), read()])).resolves.toEqual([KNOBS, KNOBS]);
    now += 59_000;
    await read();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    now += 2_000;
    await read();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/rest/v1/feature_knob?");
    expect(url).toContain("feature=eq.ops.agent_walks");
    expect((init.headers as Record<string, string>)["Accept-Profile"]).toBe("platform");
  });

  it("a missing knob returns null and screams with the remedy", async () => {
    const log = jest.fn();
    const read = createWalkKnobReader({
      fetchImpl: fakeFetch([rows[1]]),
      restUrl: "https://db.matrxserver.com",
      apiKey: "k",
      now: () => T0,
      log,
    });
    await expect(read()).resolves.toBeNull();
    const scream = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(scream).toMatch(/ops\.agent_walks production_concurrent_cap/);
    expect(scream).toMatch(/FAILING OPEN/);
    expect(scream).toMatch(/ops_agent_walks_production_cap_2026_09_26\.sql/);
  });
});

describe("walkCapGate — development against production only", () => {
  const devEnv = {
    NODE_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: "https://db.matrxserver.com",
  };

  function gateInput(overrides: Partial<Parameters<typeof walkCapGate>[0]> = {}) {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 5 * MIN],
      ["b.localhost:3001", T0 - 4 * MIN],
      ["c.localhost:3001", T0 - 4 * MIN],
      ["d.localhost:3001", T0 - 4 * MIN],
    ]);
    return {
      host: "e.localhost:3001",
      env: devEnv,
      readKnobs: jest.fn(async () => KNOBS),
      registry,
      now: T0 + MIN,
      log: jest.fn(),
      ...overrides,
    };
  }

  it("admits the 5th host by evicting the oldest active walk", async () => {
    const log = jest.fn();
    const input = gateInput({ log });
    const response = await walkCapGate(input);
    expect(response).toBeNull();
    expect(input.registry.evicted.has("a.localhost:3001")).toBe(true);
    expect(input.registry.admitted.has("e.localhost:3001")).toBe(true);
    expect(String(log.mock.calls.map((call) => call[0]).join("\n"))).toMatch(/EVICTED a\.localhost:3001/);
  });

  it("a missing knob fails OPEN — the walk proceeds", async () => {
    const input = gateInput({ readKnobs: jest.fn(async () => null) });
    await expect(walkCapGate(input)).resolves.toBeNull();
  });

  it("NODE_ENV production never evaluates the gate — no knob read, no registry touch", async () => {
    const input = gateInput({ env: { ...devEnv, NODE_ENV: "production" } });
    await expect(walkCapGate(input)).resolves.toBeNull();
    expect(input.readKnobs).not.toHaveBeenCalled();
    expect(input.registry.admitted.size).toBe(4);
  });

  it("a development server pointed at the clone is never capped", async () => {
    const input = gateInput({
      env: { ...devEnv, NEXT_PUBLIC_SUPABASE_URL: "https://hykobnqyuxspbcijrodb.supabase.co" },
    });
    await expect(walkCapGate(input)).resolves.toBeNull();
    expect(input.readKnobs).not.toHaveBeenCalled();
  });
});

describe("walk-cap dev endpoint framing and safe parking", () => {
  const originalEnv = { ...process.env };
  let nowSpy: jest.SpyInstance;
  let endpointState: { registry: WalkRegistry; listeners: Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>; readKnobs: () => Promise<WalkKnobs> };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://db.matrxserver.com",
    };
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(T0);
    endpointState = {
      registry: registryWith([]),
      listeners: new Map(),
      readKnobs: async () => KNOBS,
    };
    setWalkCapTestState(endpointState);
  });

  afterEach(() => {
    setWalkCapTestState(undefined);
    nowSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  it("writes a real SSE frame and status reads do not admit a host", async () => {
    const response = await walkCapDevEndpoint(new Request("http://frame.localhost:3001/__dev-walk?stream=1", { headers: { host: "frame.localhost:3001" } }));
    if (!response?.body) throw new Error("expected an SSE stream");
    const reader = response.body.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe("event: state\ndata: {}\n\n");
    await reader.cancel();
    expect(endpointState.listeners.has("frame.localhost:3001")).toBe(false);
  });

  it("serves the parking page to every loopback host the gate can park (no redirect loop)", async () => {
    for (const host of ["127.0.0.1:3001", "[::1]:3001", "localhost:3001"]) {
      const response = await walkCapDevEndpoint(
        new Request(`http://${host}/__dev-walk?parked=1&returnTo=%2F`, { headers: { host } }),
      );
      expect([host, response?.status]).toEqual([host, 200]);
    }
  });

  it("parks with an escaped, same-origin-only return target", async () => {
    const response = await walkCapDevEndpoint(new Request("http://frame.localhost:3001/__dev-walk?parked=1&returnTo=%2F%5Cevil", { headers: { host: "frame.localhost:3001" } }));
    const html = await response?.text();
    expect(html).toContain('value="/"');
    expect(html).toContain("font:16px/1.5 system-ui");
  });

  it("a runner that stops frees its slot at once (release), and its hold file goes with it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "walk-release-"));
    process.env.MATRX_PREVIEW_STATE_DIR = dir;
    require("node:fs").mkdirSync(join(dir, "holds"));
    writeFileSync(join(dir, "holds", "runner"), `${Math.floor(T0 / 1000) + 3600} runner\n`);
    endpointState.registry.admitted.set("runner.localhost:3001", T0 - 30_000);
    const post = (headers: Record<string, string>) =>
      walkCapDevEndpoint(new Request("http://runner.localhost:3001/__dev-walk?release=1", { method: "POST", headers: { host: "runner.localhost:3001", ...headers } }));
    try {
      expect((await post({}))?.status).toBe(403);
      expect(endpointState.registry.admitted.has("runner.localhost:3001")).toBe(true);
      const ok = await post({ "x-matrx-walk-release": "1" });
      expect(await ok?.json()).toEqual({ released: true });
      expect(endpointState.registry.admitted.has("runner.localhost:3001")).toBe(false);
      expect(endpointState.registry.evicted.has("runner.localhost:3001")).toBe(false);
      expect(heldPreviewHosts(join(dir, "holds"), Math.floor(T0 / 1000)).size).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not let status or unknown activity create an admission", async () => {
    const activity = await walkCapDevEndpoint(new Request("http://frame.localhost:3001/__dev-walk?activity=1", {
      method: "POST",
      headers: { host: "frame.localhost:3001", origin: "http://frame.localhost:3001" },
    }));
    expect(activity?.status).toBe(204);
    const stream = await walkCapDevEndpoint(new Request("http://frame.localhost:3001/__dev-walk?stream=1", { headers: { host: "frame.localhost:3001" } }));
    expect(stream?.status).toBe(200);
  });

  it("returns the eviction signal for a tombstoned activity host, while unknown activity stays a no-op", async () => {
    endpointState.registry.evicted.add("old.localhost:3001");
    const tombstoned = await walkCapDevEndpoint(new Request("http://old.localhost:3001/__dev-walk?activity=1", {
      method: "POST", headers: { host: "old.localhost:3001", origin: "http://old.localhost:3001" },
    }));
    const unknown = await walkCapDevEndpoint(new Request("http://new.localhost:3001/__dev-walk?activity=1", {
      method: "POST", headers: { host: "new.localhost:3001", origin: "http://new.localhost:3001" },
    }));
    expect(tombstoned?.status).toBe(409);
    expect(tombstoned?.headers.get(WALK_CAP_HEADER)).toBe("evicted");
    expect(unknown?.status).toBe(204);
  });

  it("notifies every same-host stream on LRU eviction and never lets it reacquire automatically", async () => {
    const registry = registryWith([
      ["old.localhost:3001", T0 - 4 * MIN], ["b.localhost:3001", T0 - 3 * MIN],
      ["c.localhost:3001", T0 - 2 * MIN], ["d.localhost:3001", T0 - MIN],
    ]);
    setWalkCapTestState({ registry, listeners: new Map(), readKnobs: async () => KNOBS });
    const streams = await Promise.all([1, 2].map(() => walkCapDevEndpoint(new Request("http://old.localhost:3001/__dev-walk?stream=1", { headers: { host: "old.localhost:3001" } }))));
    const readers = streams.map((response) => response?.body?.getReader());
    await Promise.all(readers.map((reader) => reader?.read()));
    await walkCapGateForRequest("new.localhost:3001", "document");
    const frames = await Promise.all(readers.map(async (reader) => new TextDecoder().decode((await reader?.read())?.value)));
    expect(frames).toEqual(["event: evicted\ndata: {}\n\n", "event: evicted\ndata: {}\n\n"]);
    expect(await walkCapGateForRequest("old.localhost:3001", "background")).toMatchObject({ status: 409 });
  });

  it("resumes only a tombstoned host and evicts the next LRU host", async () => {
    const registry = registryWith([
      ["a.localhost:3001", T0 - 4 * MIN], ["b.localhost:3001", T0 - 3 * MIN],
      ["c.localhost:3001", T0 - 2 * MIN], ["d.localhost:3001", T0 - MIN],
    ]);
    registry.evicted.add("returning.localhost:3001");
    setWalkCapTestState({ registry, listeners: new Map(), readKnobs: async () => KNOBS });
    const response = await walkCapDevEndpoint(new Request("http://returning.localhost:3001/__dev-walk", {
      method: "POST", headers: { host: "returning.localhost:3001", origin: "http://returning.localhost:3001", "content-type": "application/x-www-form-urlencoded" }, body: "returnTo=%2Fnotes",
    }));
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("http://returning.localhost:3001/notes");
    expect(registry.evicted.has("a.localhost:3001")).toBe(true);
  });

  it("rejects malformed or normalized-host origin spoofing", async () => {
    const malformed = await walkCapDevEndpoint(new Request("http://frame.localhost:3001/__dev-walk?activity=1", {
      method: "POST", headers: { host: "frame.localhost:3001", origin: "not a url" },
    }));
    const wrongHost = await walkCapDevEndpoint(new Request("http://localhost:3001/__dev-walk?activity=1", {
      method: "POST", headers: { host: "frame.localhost:3001", origin: "http://localhost:3001" },
    }));
    expect(malformed?.status).toBe(403);
    expect(wrongHost?.status).toBe(403);
  });

  it("cap zero shuts every admitted host down into tombstones", () => {
    const registry = registryWith([["a.localhost:3001", T0], ["b.localhost:3001", T0]]);
    const decision = decideWalkAdmission(registry, "a.localhost:3001", T0, { cap: 0, windowMinutes: 10 });
    expect(decision.evicted).toEqual(["a.localhost:3001", "b.localhost:3001"]);
    expect(registry.evicted).toEqual(new Set(["a.localhost:3001", "b.localhost:3001"]));
  });
});

describe("process-global idle expiry", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    setWalkCapTestState(undefined);
  });

  it("expires the earliest host, then reschedules after an explicit touch", () => {
    jest.setSystemTime(T0);
    const registry = registryWith([
      ["a.localhost:3001", T0],
      ["b.localhost:3001", T0 + MIN],
    ]);
    setWalkCapTestState({ registry, listeners: new Map(), readKnobs: async () => KNOBS });
    scheduleWalkIdleExpiryForTest(KNOBS);
    jest.advanceTimersByTime(9 * MIN);
    decideWalkAdmission(registry, "a.localhost:3001", T0 + 9 * MIN, KNOBS, "activity");
    scheduleWalkIdleExpiryForTest(KNOBS);
    jest.advanceTimersByTime(2 * MIN + 2);
    expect(registry.evicted.has("b.localhost:3001")).toBe(true);
    expect(registry.admitted.has("a.localhost:3001")).toBe(true);
    jest.advanceTimersByTime(8 * MIN + 1);
    expect(registry.evicted.has("a.localhost:3001")).toBe(true);
  });

  it("cleans up without leaving a timer once no admitted hosts remain", () => {
    jest.setSystemTime(T0);
    const registry = registryWith([["a.localhost:3001", T0]]);
    const state = { registry, listeners: new Map(), readKnobs: async () => KNOBS };
    setWalkCapTestState(state);
    scheduleWalkIdleExpiryForTest(KNOBS);
    jest.advanceTimersByTime(10 * MIN + 1);
    expect(registry.admitted.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("walkCapGate refusal page — names the way out", () => {
  it("a refused walk is told how to get back in, never sent to the clone", async () => {
    const response = await walkCapGate({
      host: "late.localhost:3001",
      env: { NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://db.matrxserver.com" },
      readKnobs: jest.fn(async () => ({ cap: 0, windowMinutes: 10 })),
      registry: registryWith([]),
      now: T0,
      log: jest.fn(),
    });
    expect(response?.status).toBe(503);
    const html = (await response?.text()) ?? "";
    expect(html).not.toMatch(/--clone/);
    expect(html).toContain("reload this page");
    expect(html).not.toMatch(/3002/);
    expect(html).not.toMatch(/not built|waiting is the only path/);
  });
});

// ─── BURST SLOTS (Arman, 2026-10-17: "normally maxes at 4 ... permitted to go up to 8, as long as
// they watch the memory and close it if it raises") ─────────────────────────────────────────────

const BURST: WalkKnobs = {
  cap: 4,
  windowMinutes: 10,
  burst: { burstCap: 8, admitAvailableGb: 64, shedAvailableGb: 32, admitPreviewGb: 32, shedPreviewGb: 40 },
  holdIdleMinutes: 20,
};
const HEADROOM: MemoryVerdict = { state: "headroom", why: "120 GB of memory is free" };
const TIGHT: MemoryVerdict = { state: "tight", why: "extra slots open only with 64 GB free" };
const SHED: MemoryVerdict = { state: "shed", why: "only 20 GB of memory is free" };

function snapshot(over: Partial<MemorySnapshot> = {}): MemorySnapshot {
  return { atMs: T0, availableGb: 120, totalGb: 256, previewGb: 20, pressure: 1, swapUsedGb: 0, ...over };
}

/** n hosts admitted in order h1..hn, each last seen (page and request) `idleMin` minutes ago. */
function admittedHosts(n: number, idleMin: number): WalkRegistry {
  const registry: WalkRegistry = {
    admitted: new Map(),
    evicted: new Set(),
    lastRequest: new Map(),
    admittedAt: new Map(),
  };
  for (let i = 1; i <= n; i++) {
    const h = `h${i}.localhost:3001`;
    registry.admitted.set(h, T0 - idleMin * MIN);
    registry.lastRequest!.set(h, T0 - idleMin * MIN);
    registry.admittedAt!.set(h, T0 - 60 * MIN + i);
  }
  return registry;
}

describe("parseMemorySnapshot + judgeMemory — the watchdog's reading, judged", () => {
  it("parses the watchdog's key=value file and refuses a malformed one", () => {
    const parsed = parseMemorySnapshot("epoch=1800000000\navailable_gb=132.0\nfree_gb=41.9\ntotal_gb=256.0\npressure=1\nswap_used_gb=0.0\npreview_gb=28.6\n");
    expect(parsed).toEqual({ atMs: 1_800_000_000_000, availableGb: 132, totalGb: 256, previewGb: 28.6, pressure: 1, swapUsedGb: 0 });
    expect(parseMemorySnapshot("available_gb=12\n")).toBeNull();
    expect(parseMemorySnapshot("")).toBeNull();
    expect(parseMemorySnapshot(null)).toBeNull();
  });

  it("headroom only with normal pressure, enough free memory and a small preview", () => {
    expect(judgeMemory(snapshot(), BURST.burst, T0).state).toBe("headroom");
    expect(judgeMemory(snapshot({ availableGb: 63 }), BURST.burst, T0).state).toBe("tight");
    expect(judgeMemory(snapshot({ previewGb: 33 }), BURST.burst, T0).state).toBe("tight");
    expect(judgeMemory(snapshot({ previewGb: null }), BURST.burst, T0).state).toBe("tight");
  });

  it("sheds on macOS pressure, low free memory, or a preview at its shed size", () => {
    expect(judgeMemory(snapshot({ pressure: 2 }), BURST.burst, T0)).toMatchObject({ state: "shed", why: expect.stringMatching(/pressure \(warning\)/) });
    expect(judgeMemory(snapshot({ pressure: 4 }), BURST.burst, T0).why).toMatch(/critical/);
    expect(judgeMemory(snapshot({ availableGb: 31 }), BURST.burst, T0)).toMatchObject({ state: "shed", why: expect.stringMatching(/only 31 GB/) });
    expect(judgeMemory(snapshot({ previewGb: 40 }), BURST.burst, T0)).toMatchObject({ state: "shed", why: expect.stringMatching(/preview server uses 40 GB/) });
  });

  it("a stale or missing reading, or missing burst knobs, is unknown — never headroom", () => {
    expect(judgeMemory(snapshot({ atMs: T0 - MEMORY_STALE_MS - 1 }), BURST.burst, T0).state).toBe("unknown");
    expect(judgeMemory(null, BURST.burst, T0).state).toBe("unknown");
    expect(judgeMemory(snapshot(), undefined, T0).state).toBe("unknown");
  });
});

describe("decideWalkAdmission — burst slots open only while memory is spare", () => {
  it("with headroom, a 5th..8th host gets an extra slot and nobody busy or idle is paused", () => {
    const registry = admittedHosts(4, 0.5); // all four in use (a request 30 s ago)
    for (let i = 5; i <= 8; i++) {
      const decision = decideWalkAdmission(registry, `n${i}.localhost:3001`, T0, BURST, "document", new Set(), HEADROOM);
      expect(decision).toMatchObject({ verdict: "admit", newlyAdmitted: true, burst: true, evicted: [] });
    }
    expect(registry.admitted.size).toBe(8);
    expect(burstHosts(registry, 4)).toEqual(["n5.localhost:3001", "n6.localhost:3001", "n7.localhost:3001", "n8.localhost:3001"]);
  });

  it("never past the burst cap: the 9th host is refused while all eight are in use", () => {
    const registry = admittedHosts(8, 0.5);
    const decision = decideWalkAdmission(registry, "n9.localhost:3001", T0, BURST, "document", new Set(), HEADROOM);
    expect(decision.verdict).toBe("refuse");
    expect(registry.admitted.size).toBe(8);
  });

  it("without headroom the cap stays at 4: a newcomer is refused when the four are in use", () => {
    for (const memory of [TIGHT, SHED, undefined]) {
      const registry = admittedHosts(4, 0.5);
      const decision = decideWalkAdmission(registry, "n5.localhost:3001", T0, BURST, "document", new Set(), memory);
      expect(decision.verdict).toBe("refuse");
      expect(registry.admitted.size).toBe(4);
    }
  });

  it("tight memory never grows the count: a newcomer may only swap in for an idle host", () => {
    const registry = admittedHosts(6, 0.5);
    registry.admitted.set("h6.localhost:3001", T0 - 5 * MIN);
    registry.lastRequest!.set("h6.localhost:3001", T0 - 5 * MIN); // idle past the busy guard
    const decision = decideWalkAdmission(registry, "n7.localhost:3001", T0, BURST, "document", new Set(), TIGHT);
    expect(decision).toMatchObject({ verdict: "admit", evicted: ["h6.localhost:3001"] });
    expect(registry.admitted.size).toBe(6);
  });

  it("an admitted extra host keeps working while memory is merely tight", () => {
    const registry = admittedHosts(6, 0.5);
    const decision = decideWalkAdmission(registry, "h6.localhost:3001", T0, BURST, "document", new Set(), TIGHT);
    expect(decision).toMatchObject({ verdict: "admit", newlyAdmitted: false, evicted: [] });
    expect(registry.admitted.size).toBe(6);
  });

  it("when memory rises, an extra host is paused — never a base host, even an idle one", () => {
    const registry = admittedHosts(6, 0.5);
    // base host h1 idle for 8 minutes: still never shed for memory
    registry.admitted.set("h1.localhost:3001", T0 - 8 * MIN);
    registry.lastRequest!.set("h1.localhost:3001", T0 - 8 * MIN);
    const decision = decideWalkAdmission(registry, "h2.localhost:3001", T0, BURST, "document", new Set(), SHED);
    expect(decision.shed).toHaveLength(1);
    expect(["h5.localhost:3001", "h6.localhost:3001"]).toContain(decision.shed![0]);
    expect(registry.admitted.has("h1.localhost:3001")).toBe(true);
    expect(registry.evictedWhy?.get(decision.shed![0])).toBe("memory");
  });

  it("sheds the idle extra host first, then the longest idle, a held or busy one included", () => {
    const registry = admittedHosts(7, 0.5);
    registry.admitted.set("h6.localhost:3001", T0 - 4 * MIN);
    registry.lastRequest!.set("h6.localhost:3001", T0 - 4 * MIN); // idle: shed first
    registry.lastRequest!.set("h5.localhost:3001", T0 - 1 * MIN); // busy, longer idle than h7
    registry.admitted.set("h5.localhost:3001", T0 - 1 * MIN);
    const held = new Set(["h5.localhost", "h7.localhost"]);
    expect(shedForMemory(registry, T0, BURST, SHED, held)).toEqual(["h6.localhost:3001"]);
    expect(shedForMemory(registry, T0, BURST, SHED, held)).toEqual(["h5.localhost:3001"]);
    expect(shedForMemory(registry, T0, BURST, SHED, held)).toEqual(["h7.localhost:3001"]);
    expect(shedForMemory(registry, T0, BURST, SHED, held)).toEqual([]); // back at the base cap
    expect(registry.admitted.size).toBe(4);
    expect([...registry.admitted.keys()]).toEqual(["h1.localhost:3001", "h2.localhost:3001", "h3.localhost:3001", "h4.localhost:3001"]);
  });

  it("nothing is shed unless memory says shed, or when burst knobs are missing", () => {
    for (const memory of [HEADROOM, TIGHT, { state: "unknown", why: "" } as MemoryVerdict]) {
      expect(shedForMemory(admittedHosts(6, 0.5), T0, BURST, memory)).toEqual([]);
    }
    expect(shedForMemory(admittedHosts(6, 0.5), T0, KNOBS, SHED)).toEqual([]);
  });

  it("a base host that leaves promotes the oldest extra host into a base slot", () => {
    const registry = admittedHosts(5, 0.5);
    expect(burstHosts(registry, 4)).toEqual(["h5.localhost:3001"]);
    registry.admitted.delete("h2.localhost:3001");
    registry.admittedAt!.delete("h2.localhost:3001");
    expect(burstHosts(registry, 4)).toEqual([]);
  });
});

describe("createWalkKnobReader — the burst and hold-idle knobs", () => {
  const all = [
    { key: "production_concurrent_cap", value: 4 },
    { key: "activity_window_minutes", value: 10 },
    { key: "production_burst_cap", value: 8 },
    { key: "burst_admit_available_gb", value: 64 },
    { key: "burst_shed_available_gb", value: 32 },
    { key: "burst_admit_preview_gb", value: 32 },
    { key: "burst_shed_preview_gb", value: 40 },
    { key: "hold_idle_expire_minutes", value: 20 },
  ];
  const reader = (rows: unknown[], log = jest.fn()) =>
    createWalkKnobReader({
      fetchImpl: jest.fn(async () => new Response(JSON.stringify(rows), { status: 200 })),
      restUrl: "https://db.matrxserver.com",
      apiKey: "k",
      now: () => T0,
      log,
    });

  it("reads every knob in the one request", async () => {
    await expect(reader(all)()).resolves.toEqual(BURST);
  });

  it("a missing burst knob screams BURST OFF and keeps the base cap working", async () => {
    const log = jest.fn();
    const knobs = await reader(all.filter((r) => r.key !== "burst_shed_preview_gb"), log)();
    expect(knobs).toEqual({ cap: 4, windowMinutes: 10, holdIdleMinutes: 20 });
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toMatch(/BURST OFF: .*burst_shed_preview_gb.*ops_agent_walks_burst_cap_2026_10_17\.sql/);
  });
});

describe("heldPreviewHosts — a hold ends with the process that took it", () => {
  it("drops a hold whose owner pid is gone, keeps one whose owner lives, and still reads old holds", () => {
    const dir = mkdtempSync(join(tmpdir(), "walk-holds-owner-"));
    try {
      const now = 2_000_000_000;
      writeFileSync(join(dir, "live-runner"), `${now + 600} s-a owner=101 owner_start=x\n`);
      writeFileSync(join(dir, "dead-runner"), `${now + 600} s-b owner=202 owner_start=x\n`);
      writeFileSync(join(dir, "no-owner"), `${now + 600} s-c\n`);
      const alive = (pid: number) => pid === 101;
      expect([...heldPreviewHosts(dir, now, alive)].sort()).toEqual(["live-runner.localhost", "no-owner.localhost"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("walkCapGate — refusal page and log name the memory reason", () => {
  it("a refused newcomer is told the extra slots are closed, and why", async () => {
    const log = jest.fn();
    const registry = admittedHosts(4, 0.5);
    const response = await walkCapGate({
      host: "n5.localhost:3001",
      env: { NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://db.matrxserver.com" },
      readKnobs: async () => BURST,
      registry,
      now: T0,
      log,
      memory: snapshot({ availableGb: 50 }),
    });
    expect(response?.status).toBe(503);
    const html = await response!.text();
    expect(html).toMatch(/up to 8 while this computer has spare memory/);
    expect(html).toMatch(/Extra slots are closed right now: extra slots open only with 64 GB free \(now 50 GB\)/);
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toMatch(/REFUSED n5\.localhost:3001 — 4 of 8 \(4 normal \+ 4 extra while memory is spare\).*extra slots closed/);
  });

  it("a memory shed is logged as SHED, not as an eviction for a newcomer", async () => {
    const log = jest.fn();
    const registry = admittedHosts(6, 0.5);
    await walkCapGate({
      host: "h1.localhost:3001",
      env: { NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://db.matrxserver.com" },
      readKnobs: async () => BURST,
      registry,
      now: T0,
      log,
      memory: snapshot({ pressure: 4 }),
    });
    const lines = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(lines).toMatch(/SHED h[56]\.localhost:3001 \(extra slot\) — macOS reports memory pressure \(critical\)/);
    expect(lines).not.toMatch(/EVICTED/);
  });
});
