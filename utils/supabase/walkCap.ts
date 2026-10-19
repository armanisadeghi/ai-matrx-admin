import { escapeHtml } from "@ai-matrx/kit/html-escape";
import { readdirSync, readFileSync, renameSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// utils/supabase/walkCap.ts — THE LIVE-DATABASE WALK CAP (development only).
//
// WHY (2026-09-26): the live database ran out of memory, and 70% of its time
// that day came from coding-agent browser walks. The ONE shared preview server
// (`pnpm preview:start`, port 3001) gives each agent session its own host,
// `<label>.localhost:3001`, and 15–26 of those hosts — 40–69 signed-in
// sessions per 30 minutes, all admin@admin.com — were hitting production at
// once. Arman approved: "cap concurrent agent browser walks against
// production, default 4".
//
// THE RULE. A preview host that carried a signed-in request within
// `ops.agent_walks.activity_window_minutes` is an active walk. A signed-in
// request from a host that is NOT already an active walk evicts the least
// recently used active host when the cap is full. The evicted host receives an
// SSE notice, unloads into a script-free parked page, and can only return via
// its explicit Resume form. Signed-out requests (the login page, assets)
// always pass.
//
// WHERE IT RUNS. Only in `next dev` (NODE_ENV === "development") AND only when
// the server is configured against production (`NEXT_PUBLIC_SUPABASE_URL` host
// is db.matrxserver.com). `utils/supabase/middleware.ts` reaches this module
// through a dynamic import inside a `process.env.NODE_ENV === "development"`
// branch, which a production build inlines to `false` and drops — Vercel never
// even loads this file. The function re-checks both conditions itself.
//
// NEVER BLOCKS ON ITS OWN FAILURE. A missing knob, an unreachable register or
// a missing key screams in the dev-server log with the remedy and the gate
// FAILS OPEN (Law 4: nothing fails silently; validation offers, never blocks
// on a fault of its own).
//
// BURST SLOTS (2026-10-17). Arman: "normally maxes at 4 but that when another
// session needs it, they are permitted to go up to 8, as long as they watch the
// memory and close it if it raises." Hosts beyond `production_concurrent_cap`
// (ordered by when each was admitted) are BURST hosts. A newcomer gets a burst
// slot only while the machine has headroom (`judgeMemory`: free+reclaimable
// memory, macOS pressure, the preview's own real memory — measured every 2 s by
// the preview watchdog into the state dir). When memory rises past the shed
// thresholds, burst hosts are paused one per tick (idle ones first, then the
// longest idle); a host in a base slot is never paused for memory. Every
// threshold is an `ops.agent_walks` knob.

export const WALK_CAP_FEATURE = "ops.agent_walks";
export const WALK_CAP_HEADER = "x-matrx-walk-cap";
export const PRODUCTION_DB_HOST = "db.matrxserver.com";
const CAP_KEY = "production_concurrent_cap";
const WINDOW_KEY = "activity_window_minutes";
const SEED_FILE = "migrations/ops_agent_walks_production_cap_2026_09_26.sql";
const BURST_SEED_FILE = "migrations/ops_agent_walks_burst_cap_2026_10_17.sql";
const BURST_KEYS = {
  burstCap: "production_burst_cap",
  admitAvailableGb: "burst_admit_available_gb",
  shedAvailableGb: "burst_shed_available_gb",
  admitPreviewGb: "burst_admit_preview_gb",
  shedPreviewGb: "burst_shed_preview_gb",
} as const;
const HOLD_IDLE_KEY = "hold_idle_expire_minutes";
const KNOB_TTL_MS = 60_000;

/** The burst knobs: slots beyond the base cap that exist only while memory is spare. */
export interface BurstKnobs {
  burstCap: number;
  admitAvailableGb: number;
  shedAvailableGb: number;
  admitPreviewGb: number;
  shedPreviewGb: number;
}

export interface WalkKnobs {
  cap: number;
  windowMinutes: number;
  /** Absent when its knobs are missing: the cap is then exactly `cap` (announced in the log). */
  burst?: BurstKnobs;
  /** Minutes without a signed-in request before a hold file is removed; absent = no idle expiry. */
  holdIdleMinutes?: number;
}

// ─── Memory (written by scripts/agent-dev-server.sh monitor every 2 s) ──────

export interface MemorySnapshot {
  atMs: number;
  /** free + inactive + speculative + purgeable pages, GB */
  availableGb: number;
  totalGb: number | null;
  /** the shared preview's real memory (phys_footprint of its process group), GB */
  previewGb: number | null;
  /** kern.memorystatus_vm_pressure_level: 1 normal, 2 warn, 4 critical */
  pressure: number;
  swapUsedGb: number | null;
}

export type MemoryState = "headroom" | "tight" | "shed" | "unknown";
export interface MemoryVerdict {
  state: MemoryState;
  /** plain words for the log, the refusal page and preview:status */
  why: string;
}

/** A reading older than this is not a reading: the watchdog writes one every 2 s. */
export const MEMORY_STALE_MS = 20_000;
/** While burst hosts exist, memory is re-judged (and at most one burst host shed) this often. */
export const MEMORY_TICK_MS = 5_000;

const NO_MEMORY: MemoryVerdict = { state: "unknown", why: "no memory reading" };

/** `key=value` lines -> snapshot; null when the file is absent or malformed. */
export function parseMemorySnapshot(text: string | null | undefined): MemorySnapshot | null {
  if (!text) return null;
  const kv = new Map<string, string>();
  for (const line of text.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) kv.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  const num = (k: string): number | null => {
    const v = kv.get(k);
    if (v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const epoch = num("epoch");
  const availableGb = num("available_gb");
  const pressure = num("pressure");
  if (epoch === null || availableGb === null || pressure === null) return null;
  return {
    atMs: epoch * 1000,
    availableGb,
    totalGb: num("total_gb"),
    previewGb: num("preview_gb"),
    pressure,
    swapUsedGb: num("swap_used_gb"),
  };
}

const gb = (n: number): string => `${Math.round(n)} GB`;

/**
 * THE MEMORY JUDGMENT. Deterministic: the clock is an argument.
 *   shed     — macOS pressure warn/critical, free memory under the shed line, or the preview at/over its shed size
 *   headroom — normal pressure, free memory at/over the admit line, preview under its admit size: a burst slot may open
 *   tight    — in between: no new burst slot, nobody shed (hysteresis)
 *   unknown  — no burst knobs, or no fresh reading: behaves as tight (base cap only, nobody shed for memory)
 */
export function judgeMemory(
  snapshot: MemorySnapshot | null,
  burst: BurstKnobs | undefined,
  now: number,
): MemoryVerdict {
  if (!burst) return { state: "unknown", why: "the burst knobs are missing, so only the normal slots exist" };
  if (!snapshot) return { state: "unknown", why: "no memory reading from the preview watchdog yet" };
  const age = now - snapshot.atMs;
  if (age > MEMORY_STALE_MS) {
    return { state: "unknown", why: `the last memory reading is ${Math.round(age / 1000)}s old (the preview watchdog writes one every 2s)` };
  }
  const free = snapshot.availableGb;
  const preview = snapshot.previewGb;
  if (snapshot.pressure >= 2) {
    return { state: "shed", why: `macOS reports memory pressure (${snapshot.pressure >= 4 ? "critical" : "warning"}) with ${gb(free)} free` };
  }
  if (free < burst.shedAvailableGb) {
    return { state: "shed", why: `only ${gb(free)} of memory is free (extra slots close below ${gb(burst.shedAvailableGb)})` };
  }
  if (preview !== null && preview >= burst.shedPreviewGb) {
    return { state: "shed", why: `the preview server uses ${gb(preview)} (extra slots close at ${gb(burst.shedPreviewGb)})` };
  }
  if (free >= burst.admitAvailableGb && preview !== null && preview < burst.admitPreviewGb) {
    return { state: "headroom", why: `${gb(free)} of memory is free and the preview uses ${gb(preview)}` };
  }
  const needs: string[] = [];
  if (free < burst.admitAvailableGb) needs.push(`${gb(burst.admitAvailableGb)} free (now ${gb(free)})`);
  if (preview === null) needs.push("a preview memory reading");
  else if (preview >= burst.admitPreviewGb) needs.push(`the preview under ${gb(burst.admitPreviewGb)} (now ${gb(preview)})`);
  return { state: "tight", why: `extra slots open only with ${needs.join(" and ")}` };
}

export interface ActiveWalk {
  host: string;
  idleMs: number;
  /** Since the host's last request of ANY kind (background polling included) — what keeps it busy. */
  anyRequestIdleMs?: number;
  /** A test run holds this host: it keeps its slot while it made any request within the idle window. */
  held?: boolean;
  /** base = one of the first `cap` hosts by admission time; burst = an extra slot that memory can close. */
  tier?: "base" | "burst";
}

export type WalkDecision =
  | { verdict: "admit"; newlyAdmitted: boolean; burst?: boolean; active: ActiveWalk[]; evicted: string[]; shed?: string[] }
  | { verdict: "parked"; active: ActiveWalk[]; evicted: string[]; shed?: string[] }
  | { verdict: "refuse"; active: ActiveWalk[]; evicted: string[]; shed?: string[] };

export type WalkRequestKind = "background" | "document" | "activity" | "resume";

export interface WalkRegistry {
  admitted: Map<string, number>;
  evicted: Set<string>;
  /** Last request of ANY kind per admitted host; only used to protect a busy host from LRU eviction. */
  lastRequest?: Map<string, number>;
  /** When each admitted host was admitted: the first `cap` are the base slots, the rest are burst. */
  admittedAt?: Map<string, number>;
  /** Why each tombstoned host was paused ("memory" | "needed" | "idle"): the parked page says which. */
  evictedWhy?: Map<string, EvictionReason>;
}

export type EvictionReason = "memory" | "needed" | "idle";

/** Hosts in burst slots: everything after the first `cap` by admission time (ties: insertion order). */
export function burstHosts(registry: WalkRegistry, cap: number): string[] {
  const order = [...registry.admitted.keys()]
    .map((host, index) => ({ host, index, at: registry.admittedAt?.get(host) ?? 0 }))
    .sort((a, b) => a.at - b.at || a.index - b.index);
  return order.slice(Math.max(0, cap)).map((entry) => entry.host);
}

/**
 * A host that made ANY request (document, background or explicit activity) within this many ms is in
 * use right now and is never evicted to admit another host (2026-10-10, lane HISTORY-FIELD-REVERT:
 * with 7 sessions sharing 4 slots, LRU eviction by lastSeen alone parked a host seconds after its
 * last click, it resumed, and evicted the next one — a ping-pong that paused every session every
 * 3-6 tool calls). When every slot is protected the NEWCOMER is refused instead (honest 503 page).
 * This does not extend the idle window: a host with no real interaction for the window still expires.
 */
export const WALK_BUSY_PROTECT_MS = 120_000;

/**
 * HELD HOSTS (2026-10-15). A test run takes a hold through `pnpm preview:ready` / `pnpm preview:hold`
 * (scripts/agent-dev-server.sh). A run reads pages through scripts for minutes without a click, so
 * by the rules above it looked idle: today's log alone has 30 evictions and 52 refusals, and runners
 * landed on "Preview paused" mid-run. A held host is never expired and never evicted; it counts
 * toward the cap like any walk, so when holds fill the cap a newcomer gets the honest refusal page.
 * A held host that was parked earlier is re-admitted by its next signed-in request — the hold is the
 * explicit resume. Holds expire on their own (`hold <min>`, at most 180).
 */
export function heldPreviewHosts(
  dir: string,
  nowSec: number,
  ownerAlive: (pid: number) => boolean = processAlive,
): Set<string> {
  const held = new Set<string>();
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return held; // no hold was ever taken
  }
  for (const name of names) {
    try {
      const line = readFileSync(join(dir, name), "utf8").trim();
      const until = Number(line.split(/\s+/)[0]);
      // A hold names the process that took it (`owner=<pid>`, scripts/agent-harness/stale-sessions.sh):
      // once that runner is gone the hold is debris, whatever time is left on it. The watchdog deletes
      // the file within 30 s and logs it; this check makes the slot honest in between.
      const owner = Number(/(?:^|\s)owner=(\d+)/.exec(line)?.[1]);
      if (Number.isFinite(owner) && owner > 0 && !ownerAlive(owner)) continue;
      if (Number.isFinite(until) && until > nowSec) held.add(`${name}.localhost`);
    } catch {
      // a hold file removed between the listing and the read
    }
  }
  return held;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** `s1.localhost:3001` -> `s1.localhost`: holds are per session label, whatever the port. */
function hostName(host: string): string {
  return host.replace(/:\d+$/, "");
}

/**
 * A hold keeps a host's slot only while the run is alive: the host made ANY request (document, background or
 * activity) within the idle window. A hold left behind by a runner that finished (or whose browser died) is
 * just a file with up to 180 minutes on it; it must not pin a slot past the stated idle window (MKT-174: a
 * previous runner's sign-in kept a slot for 18 minutes while the notice promised 10).
 */
export function holdKeepsSlot(
  registry: WalkRegistry,
  host: string,
  now: number,
  windowMs: number,
  held: ReadonlySet<string>,
): boolean {
  if (!held.has(hostName(host))) return false;
  const last = Math.max(registry.admitted.get(host) ?? 0, registry.lastRequest?.get(host) ?? 0);
  return now - last <= Math.min(windowMs, HELD_IDLE_PROTECT_MS);
}

/**
 * How long a held host may go without ANY request before its hold stops protecting its slot
 * (2026-10-16). With the 10-minute window, four held sessions sitting 5–8 minutes idle kept all four
 * slots while newcomers were refused 844 times in one log (a preflight waited 15 minutes, twice). A run
 * that is really walking pages touches the server far more often than this.
 */
export const HELD_IDLE_PROTECT_MS = 5 * 60_000;

/** Frees a host's slot at once (a runner that has ended): no tombstone, so the host may sign in again later. */
export function releaseWalkHost(registry: WalkRegistry, host: string): boolean {
  registry.lastRequest?.delete(host);
  registry.admittedAt?.delete(host);
  registry.evictedWhy?.delete(host);
  registry.evicted.delete(host);
  return registry.admitted.delete(host);
}

/**
 * The admission rule. `registry` maps an admitted preview host to the last
 * time of a real document navigation or explicit user interaction; background
 * requests do not refresh it. It tombstones expired/evicted hosts so they can
 * never reclaim automatically. Deterministic: the clock and the memory verdict
 * are arguments.
 *
 * Slots: the first `knobs.cap` hosts by admission time are BASE; up to
 * `knobs.burst.burstCap` more are BURST. A newcomer past the base cap takes a
 * burst slot only on `memory.state === "headroom"`; on "tight" it may only swap
 * in for an idle host (the count never grows); on "shed"/"unknown" the base cap
 * applies. On "shed" one burst host is paused per call — idle ones first, then
 * the longest idle — busy or held; a base host is never shed for memory.
 */
export function decideWalkAdmission(
  registry: WalkRegistry,
  host: string,
  now: number,
  knobs: WalkKnobs,
  kind: WalkRequestKind = "document",
  held: ReadonlySet<string> = new Set(),
  memory: MemoryVerdict = NO_MEMORY,
): WalkDecision {
  const windowMs = knobs.windowMinutes * 60_000;
  const evicted: string[] = [];
  const shed: string[] = [];
  const admittedAt = (registry.admittedAt ??= new Map());
  const evictedWhy = (registry.evictedWhy ??= new Map());
  const lastRequest = (registry.lastRequest ??= new Map());
  const isHeld = (h: string): boolean => held.has(hostName(h));
  const keepsSlot = (h: string): boolean => holdKeepsSlot(registry, h, now, windowMs, held);
  const tombstone = (h: string, why: EvictionReason): void => {
    registry.admitted.delete(h);
    lastRequest.delete(h);
    admittedAt.delete(h);
    registry.evicted.add(h);
    evictedWhy.set(h, why);
    evicted.push(h);
  };
  for (const [seenHost, lastSeen] of [...registry.admitted]) {
    if (now - lastSeen > windowMs && !keepsSlot(seenHost)) tombstone(seenHost, "idle");
  }
  const burstCap = knobs.burst ? Math.max(knobs.cap, knobs.burst.burstCap) : knobs.cap;
  const active = (): ActiveWalk[] => {
    const burst = new Set(burstHosts(registry, knobs.cap));
    return [...registry.admitted.entries()]
      .map(([h, lastSeen]) => ({
        host: h,
        idleMs: now - lastSeen,
        anyRequestIdleMs: now - Math.max(lastSeen, lastRequest.get(h) ?? 0),
        held: isHeld(h),
        tier: burst.has(h) ? ("burst" as const) : ("base" as const),
      }))
      .sort((a, b) => a.idleMs - b.idleMs);
  };

  if (knobs.cap <= 0) {
    for (const seenHost of [...registry.admitted.keys()]) tombstone(seenHost, "needed");
    return { verdict: "refuse", active: active(), evicted, shed };
  }
  if (registry.evicted.has(host) && kind !== "resume" && !isHeld(host)) {
    return { verdict: "parked", active: active(), evicted: [], shed };
  }

  const existing = registry.admitted.has(host);
  if (existing && (kind === "document" || kind === "activity" || kind === "resume")) {
    registry.admitted.set(host, now);
  }
  if (existing) lastRequest.set(host, now);
  const lastActivity = (h: string): number => Math.max(registry.admitted.get(h) ?? 0, lastRequest.get(h) ?? 0);
  const isBusy = (h: string): boolean => keepsSlot(h) || now - lastActivity(h) < WALK_BUSY_PROTECT_MS;

  // MEMORY ROSE: pause one burst host (never a base one). Idle first, then the longest idle.
  if (memory.state === "shed" && knobs.burst) {
    const victim = pickBurstToShed(registry, knobs.cap, isBusy, lastActivity);
    if (victim) {
      tombstone(victim, "memory");
      shed.push(victim);
    }
  }

  // A newly admitted host always gets a slot. Break timestamp ties by map
  // insertion order so LRU eviction is deterministic and testable.
  // Returns false when every admitted host is busy (nothing may be evicted).
  const evictOldest = (): boolean => {
    const oldest = [...registry.admitted.entries()]
      .filter(([candidateHost]) => candidateHost !== host && !isBusy(candidateHost))
      .reduce<string | null>(
        (candidate, [candidateHost, seen]) =>
          candidate === null || seen < (registry.admitted.get(candidate) ?? Infinity)
            ? candidateHost
            : candidate,
        null,
      );
    if (!oldest) return false;
    tombstone(oldest, "needed");
    return true;
  };
  if (!existing) {
    const size = registry.admitted.size;
    // headroom: grow into burst slots; tight: never grow, but an idle host may be swapped out for the
    // newcomer; shed/unknown: the base cap (idle hosts are paused to make room, busy ones never).
    const ceiling =
      memory.state === "headroom"
        ? burstCap
        : memory.state === "tight"
          ? Math.min(burstCap, Math.max(knobs.cap, size))
          : knobs.cap;
    while (registry.admitted.size >= ceiling) {
      if (!evictOldest()) return { verdict: "refuse", active: active(), evicted, shed };
    }
    registry.evicted.delete(host);
    evictedWhy.delete(host);
    registry.admitted.set(host, now);
    admittedAt.set(host, now);
    lastRequest.set(host, now);
    const burst = burstHosts(registry, knobs.cap).includes(host);
    return { verdict: "admit", newlyAdmitted: true, burst, active: active(), evicted, shed };
  }
  while (registry.admitted.size > burstCap) if (!evictOldest()) break;
  if (!registry.admitted.has(host)) {
    return { verdict: "parked", active: active(), evicted, shed };
  }
  return { verdict: "admit", newlyAdmitted: false, active: active(), evicted, shed };
}

/** The burst host memory pauses next: one that is not busy before one that is, then the longest idle. */
function pickBurstToShed(
  registry: WalkRegistry,
  cap: number,
  isBusy: (h: string) => boolean,
  lastActivity: (h: string) => number,
): string | null {
  const candidates = burstHosts(registry, cap).map((h, order) => ({ h, order, busy: isBusy(h), last: lastActivity(h) }));
  candidates.sort((a, b) => Number(a.busy) - Number(b.busy) || a.last - b.last || a.order - b.order);
  return candidates[0]?.h ?? null;
}

/**
 * The memory tick: with no request in flight, pause at most one burst host when memory says shed.
 * Returns the paused hosts (zero or one). Deterministic, like the admission rule.
 */
export function shedForMemory(
  registry: WalkRegistry,
  now: number,
  knobs: WalkKnobs,
  memory: MemoryVerdict,
  held: ReadonlySet<string> = new Set(),
): string[] {
  if (memory.state !== "shed" || !knobs.burst || registry.admitted.size <= knobs.cap) return [];
  const windowMs = knobs.windowMinutes * 60_000;
  const lastActivity = (h: string): number =>
    Math.max(registry.admitted.get(h) ?? 0, registry.lastRequest?.get(h) ?? 0);
  const isBusy = (h: string): boolean =>
    holdKeepsSlot(registry, h, now, windowMs, held) || now - lastActivity(h) < WALK_BUSY_PROTECT_MS;
  const victim = pickBurstToShed(registry, knobs.cap, isBusy, lastActivity);
  if (!victim) return [];
  registry.admitted.delete(victim);
  registry.lastRequest?.delete(victim);
  registry.admittedAt?.delete(victim);
  registry.evicted.add(victim);
  (registry.evictedWhy ??= new Map()).set(victim, "memory");
  return [victim];
}

interface KnobReaderDeps {
  fetchImpl: typeof fetch;
  restUrl: string;
  apiKey: string | undefined;
  now: () => number;
  log: (line: string) => void;
}

/**
 * ONE PostgREST read of every `ops.agent_walks` knob, cached 60 s, with
 * concurrent callers sharing the in-flight request. Returns null (after a
 * loud log line naming the remedy) when either base knob is missing or the
 * read fails — the caller fails open on null. A missing burst or hold-idle knob
 * screams too, and switches only that part off (the base cap still applies).
 */
export function createWalkKnobReader(
  deps: KnobReaderDeps,
): () => Promise<WalkKnobs | null> {
  let cached: { at: number; knobs: WalkKnobs | null } | null = null;
  let inFlight: Promise<WalkKnobs | null> | null = null;

  const scream = (why: string) => {
    deps.log(
      `[walk-cap] ============================================================\n` +
        `[walk-cap] ${why}\n` +
        `[walk-cap] FAILING OPEN: every agent walk is admitted against the live database until this is fixed.\n` +
        `[walk-cap] Remedy: seed the knobs with \`pnpm db:apply ${SEED_FILE} --target production\`, and make sure\n` +
        `[walk-cap] SUPABASE_SECRET_KEY is in .env.local. Retrying in ${KNOB_TTL_MS / 1000}s.\n` +
        `[walk-cap] ============================================================`,
    );
  };

  async function load(): Promise<WalkKnobs | null> {
    if (!deps.apiKey) {
      scream("SUPABASE_SECRET_KEY is not set, so the walk-cap knobs cannot be read.");
      return null;
    }
    const url =
      `${deps.restUrl.replace(/\/$/, "")}/rest/v1/feature_knob?` +
      `feature=eq.${WALK_CAP_FEATURE}&archived_at=is.null&select=key,value`;
    let rows: Array<{ key: string; value: unknown }>;
    try {
      const res = await deps.fetchImpl(url, {
        headers: {
          apikey: deps.apiKey,
          "Accept-Profile": "platform",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        scream(`Reading platform.feature_knob for ${WALK_CAP_FEATURE} failed: HTTP ${res.status} ${await res.text().catch(() => "")}`.slice(0, 600));
        return null;
      }
      rows = (await res.json()) as Array<{ key: string; value: unknown }>;
    } catch (error) {
      scream(`Reading platform.feature_knob for ${WALK_CAP_FEATURE} threw: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const numeric = (key: string): number | null => {
      const value = byKey.get(key);
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    };
    for (const key of [CAP_KEY, WINDOW_KEY]) {
      if (numeric(key) === null) {
        scream(`Missing feature knob: ${WALK_CAP_FEATURE} ${key} (got ${JSON.stringify(byKey.get(key))}).`);
        return null;
      }
    }
    const knobs: WalkKnobs = { cap: numeric(CAP_KEY) as number, windowMinutes: numeric(WINDOW_KEY) as number };
    const missingBurst = Object.values(BURST_KEYS).filter((key) => numeric(key) === null);
    if (missingBurst.length === 0) {
      knobs.burst = {
        burstCap: numeric(BURST_KEYS.burstCap) as number,
        admitAvailableGb: numeric(BURST_KEYS.admitAvailableGb) as number,
        shedAvailableGb: numeric(BURST_KEYS.shedAvailableGb) as number,
        admitPreviewGb: numeric(BURST_KEYS.admitPreviewGb) as number,
        shedPreviewGb: numeric(BURST_KEYS.shedPreviewGb) as number,
      };
    } else {
      deps.log(
        `[walk-cap] BURST OFF: missing feature knob(s) ${missingBurst.map((k) => `${WALK_CAP_FEATURE} ${k}`).join(", ")} — ` +
          `the cap stays at ${knobs.cap} with no extra slots. Remedy: \`pnpm db:apply ${BURST_SEED_FILE}\`.`,
      );
    }
    const holdIdle = numeric(HOLD_IDLE_KEY);
    if (holdIdle !== null) knobs.holdIdleMinutes = holdIdle;
    else {
      deps.log(
        `[walk-cap] HOLD IDLE EXPIRY OFF: missing feature knob ${WALK_CAP_FEATURE} ${HOLD_IDLE_KEY} — holds end only at their own ` +
          `time or when their runner process exits. Remedy: \`pnpm db:apply ${BURST_SEED_FILE}\`.`,
      );
    }
    return knobs;
  }

  return async () => {
    if (cached && deps.now() - cached.at < KNOB_TTL_MS) return cached.knobs;
    if (inFlight) return inFlight;
    inFlight = load()
      .then((knobs) => {
        cached = { at: deps.now(), knobs };
        return knobs;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s ago`;
}

function refusalPage(host: string, active: ActiveWalk[], knobs: WalkKnobs, memory: MemoryVerdict = NO_MEMORY): string {
  const list = active.length
    ? active
        .map((w) => {
          const any = w.anyRequestIdleMs ?? w.idleMs;
          const why = w.held
            ? `held by a test run — keeps its slot until it makes no request for ${knobs.windowMinutes} minutes`
            : any < WALK_BUSY_PROTECT_MS
              ? "in use (a request in the last " + WALK_BUSY_PROTECT_MS / 1000 + " seconds)"
              : "can be paused for you";
          const slot = w.tier === "burst" ? " (extra slot)" : "";
          return `<li><code>${escapeHtml(w.host)}</code> — last page ${ago(w.idleMs)}, last request of any kind ${ago(any)}${slot}: ${why}</li>`;
        })
        .join("")
    : "<li>(none — the cap is 0, so no agent walk may sign in against production)</li>";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Live-database walk cap</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:48px auto;padding:0 16px;color:#1a1a1a;background:#fff}
code{background:#f1f1f1;padding:1px 5px;border-radius:4px}
@media (prefers-color-scheme:dark){body{color:#eee;background:#141414}code{background:#2a2a2a}}
</style></head><body>
<h1>This preview is over the live-database walk cap</h1>
<p>${active.length} agent sessions are already signed in against production (the cap is ${knobs.cap}${knobs.burst ? `, up to ${Math.max(knobs.cap, knobs.burst.burstCap)} while this computer has spare memory` : ""}):</p>
<ul>${list}</ul>
${knobs.burst ? `<p>Extra slots are ${memory.state === "headroom" ? "open" : "closed"} right now: ${escapeHtml(memory.why)}.</p>` : ""}
<p>A session in use is never paused for another. An unheld session frees after ${WALK_BUSY_PROTECT_MS / 1000} seconds with no request of any kind (background polling counts); a held one only after ${knobs.windowMinutes} minutes with no request — then reload this page.</p>
<p><small>Host refused: <code>${escapeHtml(host)}</code>. Knobs: <code>${WALK_CAP_FEATURE}.${CAP_KEY}</code>, <code>${WALK_CAP_FEATURE}.${WINDOW_KEY}</code> and <code>${WALK_CAP_FEATURE}.${BURST_KEYS.burstCap}</code>. This check runs only in local development against the live database.</small></p>
</body></html>`;
}

export interface WalkCapGateInput {
  host: string | null;
  env: { NODE_ENV?: string; NEXT_PUBLIC_SUPABASE_URL?: string };
  readKnobs: () => Promise<WalkKnobs | null>;
  registry: WalkRegistry;
  now: number;
  log: (line: string) => void;
  kind?: WalkRequestKind;
  /** Hosts a test run holds (`heldPreviewHosts`); never expired or evicted. */
  held?: ReadonlySet<string>;
  /** The machine's memory now (`readMemorySnapshot`); absent = unknown (base cap only). */
  memory?: MemorySnapshot | null;
}

function pointsAtProduction(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).host === PRODUCTION_DB_HOST;
  } catch {
    return false;
  }
}

/**
 * Decide one SIGNED-IN request. Returns the 503 refusal, or null to let the
 * request through. Callers must only call this for a signed-in request.
 */
export async function walkCapGate(input: WalkCapGateInput): Promise<Response | null> {
  if (input.env.NODE_ENV !== "development") return null;
  if (!pointsAtProduction(input.env.NEXT_PUBLIC_SUPABASE_URL)) return null;
  const host = input.host ?? "(no host header)";

  const knobs = await input.readKnobs();
  if (!knobs) return null; // already screamed; fail open

  const memory = judgeMemory(input.memory ?? null, knobs.burst, input.now);
  const decision = decideWalkAdmission(input.registry, host, input.now, knobs, input.kind, input.held, memory);
  const count = decision.active.length;
  const shed = new Set(decision.shed ?? []);
  if (shed.size) input.log(`[walk-cap] SHED ${[...shed].join(", ")} (extra slot) — ${memory.why}`);
  const others = decision.evicted.filter((h) => !shed.has(h));
  if (others.length) {
    input.log(`[walk-cap] EVICTED ${others.join(", ")} to admit ${host}`);
  }
  const capLabel = (n: number): string =>
    knobs.burst && knobs.burst.burstCap > knobs.cap
      ? `${n} of ${knobs.burst.burstCap} (${knobs.cap} normal + ${knobs.burst.burstCap - knobs.cap} extra while memory is spare)`
      : `${n}/${knobs.cap}`;
  if (decision.verdict === "admit") {
    if (decision.newlyAdmitted) {
      input.log(
        `[walk-cap] ADMITTED ${host}${decision.burst ? " into an EXTRA slot" : ""} — ${capLabel(count)} live-database walks active` +
          (decision.burst
            ? memory.state === "headroom"
              ? `; ${memory.why}`
              : ` (swapped in for an idle session; no new extra slot: ${memory.why})`
            : ""),
      );
    }
    return null;
  }
  if (decision.verdict === "parked") {
    return new Response("Walk evicted; resume explicitly to reclaim a production preview slot.", {
      status: 409,
      headers: { "cache-control": "no-store", [WALK_CAP_HEADER]: "evicted" },
    });
  }
  input.log(
    `[walk-cap] REFUSED ${host} — ${capLabel(count)} live-database walks already active` +
      (knobs.burst ? ` (extra slots ${memory.state === "headroom" ? "full" : "closed"}: ${memory.why})` : "") +
      ": " +
      decision.active.map((w) => `${w.host} (${ago(w.idleMs)})`).join(", "),
  );
  return new Response(refusalPage(host, decision.active, knobs, memory), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      [WALK_CAP_HEADER]: "refused",
    },
  });
}

// ─── Process-wide state (survives HMR via globalThis) ──────────────────────

interface WalkCapGlobal {
  registry: WalkRegistry;
  readKnobs: () => Promise<WalkKnobs | null>;
  listeners: Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>;
  idleTimer?: ReturnType<typeof setTimeout>;
  memoryTimer?: ReturnType<typeof setTimeout>;
}

const GLOBAL_KEY = "__matrxWalkCap";

/** Test-only seam for endpoint integration coverage; never called by app code. */
export function setWalkCapTestState(state: WalkCapGlobal | undefined): void {
  const globalState = globalThis as unknown as Record<string, WalkCapGlobal | undefined>;
  if (globalState[GLOBAL_KEY]?.idleTimer) clearTimeout(globalState[GLOBAL_KEY].idleTimer);
  if (globalState[GLOBAL_KEY]?.memoryTimer) clearTimeout(globalState[GLOBAL_KEY].memoryTimer);
  globalState[GLOBAL_KEY] = state;
}

function processState(): WalkCapGlobal {
  const g = globalThis as unknown as Record<string, WalkCapGlobal | undefined>;
  let state = g[GLOBAL_KEY];
  if (!state) {
    state = {
      registry: { admitted: new Map(), evicted: new Set() },
      listeners: new Map(),
      // The service-role (secret) key is used HERE ONLY because
      // platform.feature_knob has no anon read policy and the proxy has no
      // user-scoped client handy before the session pass. This whole module
      // is reachable only from `next dev` (see header); the key never leaves
      // the local dev server process.
      readKnobs: createWalkKnobReader({
        fetchImpl: fetch,
        restUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        apiKey: process.env.SUPABASE_SECRET_KEY?.trim(),
        now: Date.now,
        log: (line) => console.error(line),
      }),
    };
    g[GLOBAL_KEY] = state;
  }
  // HMR from the former Map-only implementation keeps useful admission order
  // while adding tombstones/listeners without throwing active walks away.
  if ((state.registry as unknown) instanceof Map) {
    state.registry = { admitted: state.registry as unknown as Map<string, number>, evicted: new Set() };
  }
  if (!state.listeners) state.listeners = new Map();
  return state;
}

/** One process timer, always aimed at the earliest current inactivity deadline. */
function scheduleIdleExpiry(state: WalkCapGlobal, knobs: WalkKnobs, now = Date.now()): void {
  if (state.idleTimer) clearTimeout(state.idleTimer);
  state.idleTimer = undefined;
  if (knobs.cap <= 0 || state.registry.admitted.size === 0) return;

  const windowMs = knobs.windowMinutes * 60_000;
  const held = currentHolds();
  // A held host expires too once it has made no request of any kind for the window; a lapsing hold is
  // noticed by the same deadline.
  const lastActive = (host: string, seen: number): number =>
    held.has(hostName(host)) ? Math.max(seen, state.registry.lastRequest?.get(host) ?? 0) : seen;
  const earliestDeadline = Math.min(
    ...[...state.registry.admitted.entries()].map(([host, seen]) => lastActive(host, seen) + windowMs + 1),
  );
  const delay = Math.max(0, earliestDeadline - now);
  state.idleTimer = setTimeout(() => {
    state.idleTimer = undefined;
    const expired: string[] = [];
    const current = Date.now();
    const heldNow = currentHolds();
    for (const [host, lastSeen] of state.registry.admitted) {
      if (current - lastSeen > windowMs && !holdKeepsSlot(state.registry, host, current, windowMs, heldNow)) {
        state.registry.admitted.delete(host);
        state.registry.admittedAt?.delete(host);
        state.registry.evicted.add(host);
        (state.registry.evictedWhy ??= new Map()).set(host, "idle");
        expired.push(host);
      }
    }
    notifyEvicted(expired);
    if (expired.length) console.log(`[walk-cap] IDLE EVICTED ${expired.join(", ")}`);
    publishWalkState(state, knobs, current, expired.length > 0);
    scheduleIdleExpiry(state, knobs, current);
  }, delay);
  (state.idleTimer as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
}

/**
 * THE MEMORY WATCH. While any host sits in a burst slot, memory is re-judged every MEMORY_TICK_MS
 * with no request needed, and one burst host is paused per tick while it says shed — so extra
 * walks close as memory rises even when nobody new is asking for a slot.
 */
function scheduleMemoryWatch(state: WalkCapGlobal, knobs: WalkKnobs): void {
  if (state.memoryTimer) return;
  if (!knobs.burst || state.registry.admitted.size <= knobs.cap) return;
  state.memoryTimer = setTimeout(() => {
    state.memoryTimer = undefined;
    const now = Date.now();
    const memory = judgeMemory(readMemorySnapshot(), knobs.burst, now);
    const shed = shedForMemory(state.registry, now, knobs, memory, currentHolds());
    if (shed.length) {
      notifyEvicted(shed);
      console.log(`[walk-cap] SHED ${shed.join(", ")} (extra slot) — ${memory.why}`);
    }
    publishWalkState(state, knobs, now, shed.length > 0, memory);
    scheduleMemoryWatch(state, knobs);
  }, MEMORY_TICK_MS);
  (state.memoryTimer as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
}

/** Test-only seam for timer behavior; production callers use the gate wrapper. */
export function scheduleWalkIdleExpiryForTest(knobs: WalkKnobs): void {
  scheduleIdleExpiry(processState(), knobs);
}

/** Test-only seam: start the memory watch for the process-global registry. */
export function scheduleWalkMemoryWatchForTest(knobs: WalkKnobs): void {
  scheduleMemoryWatch(processState(), knobs);
}

// The hold files and the memory reading live in the shared preview's state dir
// (scripts/agent-dev-server.sh STATE_DIR).
function previewStateDir(): string {
  return (
    process.env.MATRX_PREVIEW_STATE_DIR ||
    join(process.env.TMPDIR || "/tmp", `matrx-frontend-preview-${typeof process.getuid === "function" ? process.getuid() : ""}`)
  );
}

const HOLDS_TTL_MS = 5_000;
let holdsCache: { at: number; held: Set<string> } | null = null;
function currentHolds(): Set<string> {
  const now = Date.now();
  if (holdsCache && now - holdsCache.at < HOLDS_TTL_MS) return holdsCache.held;
  holdsCache = { at: now, held: heldPreviewHosts(join(previewStateDir(), "holds"), Math.floor(now / 1000)) };
  return holdsCache.held;
}

const MEMORY_TTL_MS = 2_000;
let memoryCache: { at: number; snapshot: MemorySnapshot | null } | null = null;
/** The watchdog's latest machine-memory reading (`<state dir>/memory`), cached 2 s. */
export function readMemorySnapshot(): MemorySnapshot | null {
  const now = Date.now();
  if (memoryCache && now - memoryCache.at < MEMORY_TTL_MS) return memoryCache.snapshot;
  let text: string | null = null;
  try {
    text = readFileSync(join(previewStateDir(), "memory"), "utf8");
  } catch {
    // no watchdog has written one: judged "unknown", base cap only
  }
  memoryCache = { at: now, snapshot: parseMemorySnapshot(text) };
  return memoryCache.snapshot;
}

function holdLabel(host: string): string {
  return hostName(host).replace(/\.localhost$/, "").replace(/[^A-Za-z0-9._-]/g, "_");
}

function releaseHoldFile(host: string): void {
  try {
    unlinkSync(join(previewStateDir(), "holds", holdLabel(host)));
  } catch {
    // no hold was taken
  }
}

/**
 * HOLD HEARTBEAT. A held host's signed-in requests touch its hold file (at most every 30 s), so the
 * watchdog can end a hold whose host went quiet for `hold_idle_expire_minutes` — a finished run's
 * hold no longer blocks every recycle for up to 180 minutes.
 */
const HEARTBEAT_EVERY_MS = 30_000;
const heartbeats = new Map<string, number>();
function heartbeatHold(host: string, held: ReadonlySet<string>, now: number): void {
  if (!held.has(hostName(host))) return;
  const label = holdLabel(host);
  if (now - (heartbeats.get(label) ?? 0) < HEARTBEAT_EVERY_MS) return;
  heartbeats.set(label, now);
  try {
    const t = new Date(now);
    utimesSync(join(previewStateDir(), "holds", label), t, t);
  } catch {
    // the hold was released between the read and the touch
  }
}

/**
 * THE PUBLISHED STATE. `pnpm preview:status` prints the walks from `<state dir>/walks.json`, and the
 * watchdog reads the hold idle limit from `<state dir>/walk-knobs`. Written at most every 2 s unless
 * something changed (an admission, a shed, an expiry).
 */
const PUBLISH_EVERY_MS = 2_000;
let lastPublish = 0;
function publishWalkState(
  state: WalkCapGlobal,
  knobs: WalkKnobs,
  now: number,
  changed: boolean,
  memory: MemoryVerdict = judgeMemory(readMemorySnapshot(), knobs.burst, now),
): void {
  if (!changed && now - lastPublish < PUBLISH_EVERY_MS) return;
  lastPublish = now;
  const dir = previewStateDir();
  const burst = new Set(burstHosts(state.registry, knobs.cap));
  const held = currentHolds();
  const body = {
    at: new Date(now).toISOString(),
    cap: knobs.cap,
    burstCap: knobs.burst ? Math.max(knobs.cap, knobs.burst.burstCap) : knobs.cap,
    memory,
    active: [...state.registry.admitted.entries()].map(([host, seen]) => ({
      host,
      tier: burst.has(host) ? "burst" : "base",
      lastPageSec: Math.round((now - seen) / 1000),
      lastRequestSec: Math.round((now - Math.max(seen, state.registry.lastRequest?.get(host) ?? 0)) / 1000),
      held: held.has(hostName(host)),
    })),
    paused: [...state.registry.evicted].length,
  };
  try {
    const tmp = join(dir, `.walks.json.${process.pid}`);
    writeFileSync(tmp, `${JSON.stringify(body, null, 1)}\n`);
    renameSync(tmp, join(dir, "walks.json"));
    const knobLines = [`cap=${knobs.cap}`, `burst_cap=${body.burstCap}`];
    if (knobs.holdIdleMinutes !== undefined) knobLines.push(`hold_idle_expire_minutes=${knobs.holdIdleMinutes}`);
    const tmpKnobs = join(dir, `.walk-knobs.${process.pid}`);
    writeFileSync(tmpKnobs, `${knobLines.join("\n")}\n`);
    renameSync(tmpKnobs, join(dir, "walk-knobs"));
  } catch {
    // no preview state dir (a test, or a server not started by preview:start): nothing to publish into
  }
}

/** The proxy's entry point: gate one signed-in request with process-wide state. */
export async function walkCapGateForRequest(
  host: string | null,
  kind: WalkRequestKind,
): Promise<Response | null> {
  if (process.env.NODE_ENV !== "development" || !pointsAtProduction(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return null;
  }
  const state = processState();
  const before = new Set(state.registry.evicted);
  const sizeBefore = state.registry.admitted.size;
  const now = Date.now();
  const held = currentHolds();
  const response = await walkCapGate({
    host,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    readKnobs: state.readKnobs,
    registry: state.registry,
    now,
    log: (line) => console.log(line),
    kind,
    held,
    memory: readMemorySnapshot(),
  });
  const newlyEvicted = [...state.registry.evicted].filter((candidate) => !before.has(candidate));
  notifyEvicted(newlyEvicted);
  if (host) heartbeatHold(host, held, now);
  const knobs = await state.readKnobs();
  if (knobs) {
    scheduleIdleExpiry(state, knobs);
    scheduleMemoryWatch(state, knobs);
    publishWalkState(state, knobs, now, newlyEvicted.length > 0 || state.registry.admitted.size !== sizeBefore);
  }
  return response;
}

const encoder = new TextEncoder();

function isDevProductionLocalhost(host: string | null): boolean {
  return process.env.NODE_ENV === "development" &&
    pointsAtProduction(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(
      host &&
        (host === "localhost" ||
          host.startsWith("localhost:") ||
          host.includes(".localhost:") ||
          // The gate parks EVERY local host, so the parking page must serve every one it can park,
          // or a 127.0.0.1 / [::1] tab redirects to an unhandled /__dev-walk forever.
          host === "127.0.0.1" ||
          host.startsWith("127.0.0.1:") ||
          host === "[::1]" ||
          host.startsWith("[::1]:")),
    );
}

const PARKED_WHY: Record<EvictionReason | "unknown", string> = {
  memory: "This preview was paused to free memory: it was in one of the extra slots, and the computer ran low.",
  needed: "This preview was paused because its slot was needed by another session.",
  idle: "This preview was paused because it was idle.",
  unknown: "This preview was paused because it was idle or its slot was needed by another session.",
};

function parkedPage(returnTo: string, reason: EvictionReason | "unknown" = "unknown"): string {
  const safe = escapeHtml(returnTo);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview paused</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:48px auto;padding:0 16px;color:#1a1a1a;background:#fff}button{font:inherit;padding:9px 14px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;cursor:pointer}@media (prefers-color-scheme:dark){body{color:#eee;background:#141414}}</style></head><body><main><h1>This preview was paused</h1><p>${PARKED_WHY[reason]} This tab has stopped loading the app and its live database activity.</p><form method="post" action="/__dev-walk"><input type="hidden" name="returnTo" value="${safe}"><button type="submit">Resume this preview</button></form></main></body></html>`;
}

function safeReturnTo(value: string | null): string {
  if (!value || value.startsWith("\\") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "http://walk-cap.localhost");
    if (url.origin !== "http://walk-cap.localhost" || url.pathname === "/__dev-walk") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function isSameOrigin(origin: string | null, host: string, protocol: string): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && parsed.protocol === protocol;
  } catch {
    return false;
  }
}

function notifyEvicted(hosts: string[]): void {
  const state = processState();
  for (const host of hosts) {
    for (const controller of state.listeners.get(host) ?? []) {
      try {
        controller.enqueue(encoder.encode("event: evicted\ndata: {}\n\n"));
        controller.close();
      } catch {
        // A tab can close between the listener snapshot and eviction.
      }
    }
    state.listeners.delete(host);
  }
}

/** Development-only proxy endpoint; it never admits or refreshes via SSE status. */
export async function walkCapDevEndpoint(request: Request): Promise<Response | null> {
  const host = request.headers.get("host");
  if (!isDevProductionLocalhost(host)) return null;
  const state = processState();
  const url = new URL(request.url);
  const normalizedHost = host as string;
  const requestOrigin = `${url.protocol}//${normalizedHost}`;
  if (request.method === "GET" && url.searchParams.get("parked") === "1") {
    return new Response(parkedPage(safeReturnTo(url.searchParams.get("returnTo")), state.registry.evictedWhy?.get(normalizedHost) ?? "unknown"), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (request.method === "GET" && url.searchParams.get("stream") === "1") {
    const knobs = await state.readKnobs();
    if (knobs) scheduleIdleExpiry(state, knobs);
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
        const set = state.listeners.get(normalizedHost) ?? new Set();
        set.add(controller);
        state.listeners.set(normalizedHost, set);
        const event = state.registry.evicted.has(normalizedHost) ? "evicted" : "state";
        controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
      },
      cancel() {
        const listeners = state.listeners.get(normalizedHost);
        if (controllerRef) listeners?.delete(controllerRef);
        if (listeners?.size === 0) state.listeners.delete(normalizedHost);
      },
    });
    request.signal.addEventListener("abort", () => {
      const listeners = state.listeners.get(normalizedHost);
      if (controllerRef) listeners?.delete(controllerRef);
      if (listeners?.size === 0) state.listeners.delete(normalizedHost);
    }, { once: true });
    return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" } });
  }
  if (request.method === "POST" && url.searchParams.get("release") === "1") {
    // A runner that has ended (scripts/test-browser.mjs stop) frees its slot at once. A custom header keeps a
    // cross-site form post from releasing someone's slot; the host is the session label, so a runner can only
    // release its own.
    if (request.headers.get("x-matrx-walk-release") !== "1") return new Response("release header required", { status: 403 });
    const released = releaseWalkHost(state.registry, normalizedHost);
    releaseHoldFile(normalizedHost);
    holdsCache = null;
    notifyEvicted([normalizedHost]);
    console.log(`[walk-cap] RELEASED ${normalizedHost}${released ? "" : " (was not admitted)"}`);
    return new Response(JSON.stringify({ released }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  if (request.method === "POST") {
    if (url.searchParams.get("activity") === "1") {
      const origin = request.headers.get("origin");
      if (!isSameOrigin(origin, normalizedHost, url.protocol)) return new Response("same-origin required", { status: 403 });
      if (state.registry.evicted.has(normalizedHost)) {
        return new Response("Walk evicted; resume explicitly to reclaim a production preview slot.", {
          status: 409,
          headers: { "cache-control": "no-store", [WALK_CAP_HEADER]: "evicted" },
        });
      }
      // A signed-out/login tab can mount the monitor before its first admitted
      // document request. Its clicks are a no-op, never an implicit admission.
      if (!state.registry.admitted.has(normalizedHost)) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      const response = await walkCapGateForRequest(normalizedHost, "activity");
      return response ?? new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    const origin = request.headers.get("origin");
    if (!isSameOrigin(origin, normalizedHost, url.protocol)) return new Response("same-origin required", { status: 403 });
    if (!state.registry.evicted.has(normalizedHost)) {
      return new Response("Only an evicted preview may resume here.", { status: 409, headers: { "cache-control": "no-store" } });
    }
    const form = await request.formData();
    const returnTo = safeReturnTo(typeof form.get("returnTo") === "string" ? form.get("returnTo") as string : null);
    const before = new Set(state.registry.evicted);
    const response = await walkCapGateForRequest(normalizedHost, "resume");
    if (response) return response.status === 409 ? new Response(parkedPage(returnTo, state.registry.evictedWhy?.get(normalizedHost) ?? "unknown"), { status: 409, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }) : response;
    notifyEvicted([...state.registry.evicted].filter((candidate) => !before.has(candidate)));
    return Response.redirect(new URL(returnTo, requestOrigin), 303);
  }
  return new Response("not found", { status: 404 });
}

/** Explicit user activity only; background proxy traffic never calls this. */
export async function recordWalkActivity(host: string | null): Promise<Response | null> {
  return walkCapGateForRequest(host, "activity");
}
