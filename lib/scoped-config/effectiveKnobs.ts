// lib/scoped-config/effectiveKnobs.ts
//
// THE runtime read of ladder-resolved settings for the signed-in person — the
// answers `platform.knob_snapshot` gives for (organization, user, scopes), the
// same nearest-rung-wins resolution the settings surface shows, so a feature
// that consumes a setting and the screen that edits it can never disagree.
//
// 🚨 ONE FETCH, NOT ONE PER SETTING (Arman, 2026-09-20: *"the one thing that
// absolutely cannot happen is that we can't be fetching individual
// configurations for everything that we do, and we can't be trying to do these
// things live or through any sort of application level logic regardless of if
// it's a server or the client"*). Until this file was rewritten, every knob a
// screen read was its own `platform.knob_resolve` round trip: the Masterwork
// record surface alone opened five, the Question Desk five more, and a page
// carrying both paid ten network calls to learn ten small values. The whole
// register — every knob, resolved for this person in this organization — is
// 870 keys and 44 kB and answers in 47 ms, measured live on 2026-09-20. So the
// client fetches THAT, once per (organization, user, scope address), and every
// read after it is a lookup in a `Map`. Adding a knob to a screen now costs
// nothing at run time, which is the property that makes law 6 ("opinions become
// knobs") affordable.
//
// A missing key is not a default nobody chose: `knob_snapshot` carries a row
// for every registered knob, so an address the map does not hold is a knob that
// is NOT SEEDED, and `ensureEffectiveKnob` says so by name with the remedy —
// the same failure `knob_resolve`'s `P0001 … is not seeded` used to raise.
//
// It also ends the dotted-address ambiguity at the READ: the map is keyed by
// `feature || '.' || key`, and re-joining a ref that was split at its last dot
// reproduces that string exactly, whichever segment the dot really belonged to.
// The pair still matters for WRITES (`knob_override_set`) and for the failure
// message, so `knobAddress` stays.
//
// `lib/knobs/featureKnobs.ts` reads the PLATFORM value of a register row (the
// admin limits); this module reads the EFFECTIVE value after the organization,
// device and personal rungs. Use this one for anything a person or organization
// may override (`overridable_by` non-empty).
//
// Cache busting is event-driven, exactly as Arman described ("just like we have
// with editing agents"): every write through `setKnobOverride` (same tab) and
// the platform directive channel's `settings_changed` (other tabs, the server)
// drops the snapshots, and the next read re-fetches one. The TTL below is a
// backstop for a missed directive, not the mechanism; a tab coming back into
// view also re-checks its held snapshots (`catchUpKnobsSinceBoot`, one etag
// call each, answered "unchanged" for ~2 ms server-side). A React face is
// `useEffectiveKnob` (useSyncExternalStore), so a control showing the value
// re-renders the moment a write lands.
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { createClient } from "@/utils/supabase/client";
import { registerDirectiveHandler } from "@/lib/client-directives/directiveRegistry";
import { getWebDeviceId } from "./deviceId";
import { defineClientKey } from "@/lib/sync/client-storage";
import { noteKnobReadOnce } from "@/lib/config-attestation/readLedger";
import { drainBootSeeds, STREAMED_KNOB_SEED_GLOBAL } from "@/lib/boot/bootSeedSlot";
import {
  applyKnobDefaultsPatch,
  flattenKnobBuckets,
  knobDefaultsAsk,
  knobDefaultsFromAnswer,
  knobDeltaPatch,
  knobEtagFor,
  KNOB_DEFAULTS_BUCKETED,
  type KnobBuckets,
  type KnobDefaults,
} from "@ai-matrx/data/knobs";

// DB lane A (2026-10-21): was 60 s, and every tab re-asked every address once a minute — the
// biggest browser cost on the database (41k calls / 5.7 h). Writes and directives invalidate; the
// focus re-check below covers a tab that slept through one.
export const KNOB_SNAPSHOT_TTL_MS = 10 * 60_000;
/** A tab hidden at least this long re-checks its held snapshots when it becomes visible again. */
export const KNOB_FOCUS_RECHECK_AFTER_MS = 60_000;
const TTL_MS = KNOB_SNAPSHOT_TTL_MS;

/**
 * Every registered knob, resolved for one (organization, user, scope address).
 * `resolved` is keyed by `feature || '.' || key` exactly as the RPC builds it;
 * `stamp` is the database's own `now()` at resolution, carried so a log or a
 * future conditional re-fetch can say WHICH answers a screen is showing.
 */
type Snapshot = { resolved: Record<string, unknown>; stamp: string | null; at: number };

const snapshots = new Map<string, Snapshot>();
const inFlight = new Map<string, Promise<Snapshot>>();
const listeners = new Set<() => void>();

/**
 * 🚨 A FETCH THAT STARTED BEFORE A WRITE MUST NOT OUTLIVE IT.
 *
 * Every invalidation bumps this. A fetch reads it before it asks and again
 * when the answer lands: if it moved, that answer describes the register as it
 * was BEFORE the write, and installing it would put the pre-write value back
 * in the cache — where `useEffectiveKnob` would see a defined value, stop
 * asking, and show the person the setting they just changed away from, for a
 * whole TTL. Clearing the cache alone does not prevent this, because the
 * in-flight promise resolves afterwards and writes into the cleared map
 * (found by Cursor Bugbot on PR 238, 2026-09-20, before it ever ran).
 */
let generation = 0;

/** How many times a fetch re-asks when a write lands mid-flight. */
const MAX_RACE_RETRIES = 3;

/**
 * A rung nearer than the organization that this READ should take into account —
 * the entity the value is being resolved FOR (`{ kind: "rulebook", id }`,
 * `{ kind: "agent", id }`, …). The rung must be registered in
 * `platform.knob_scope_kind` and named in the knob's `overridable_by`, or the
 * resolver ignores it; the device rung is added automatically below and never
 * belongs here.
 */
export interface KnobScope {
  kind: string;
  id: string;
}

/**
 * The `p_scopes` payload: this browser's device rung plus whatever entity rungs
 * the caller is resolving for. `undefined` (not `[]`) when there is nothing to
 * send — `knob_resolve` raises `22023` on anything that is not an array or NULL.
 */
function buildScopes(
  deviceId: string | null | undefined,
  scopes: readonly KnobScope[] | undefined,
): KnobScope[] | undefined {
  const all: KnobScope[] = [];
  if (deviceId) all.push({ kind: "device", id: deviceId });
  for (const scope of scopes ?? []) {
    if (scope?.kind && scope?.id) all.push({ kind: scope.kind, id: scope.id });
  }
  return all.length > 0 ? all : undefined;
}

function scopeAddr(scopes: readonly KnobScope[] | undefined): string {
  if (!scopes?.length) return "";
  return scopes.map((s) => `${s.kind}:${s.id}`).join(",");
}

/**
 * The SNAPSHOT's address — never a key's. The entity rungs are part of it: two
 * Rulebooks in one org can legitimately resolve the same key to different
 * values, and a cache that forgot them would serve one Rulebook's answer for
 * another. The organization is in it for the same reason, one rung up: a person
 * in two organizations gets two snapshots, never one blended answer.
 */
function snapshotAddr(
  organizationId: string | null,
  userId: string | null,
  scopes?: readonly KnobScope[],
): string {
  return `${organizationId ?? "~no-organization~"}|${userId ?? ""}|${scopeAddr(scopes)}`;
}

/**
 * 🚨 "NO VALUE YET" IS A STATE A READER MUST BE ABLE TO LEAVE.
 *
 * `useEffectiveKnob` decides whether to ask by looking at its own value, so an
 * `undefined` that STAYS `undefined` across a notification changes nothing in
 * its dependency list and its effect never re-runs — the reader sits on its
 * consumer's default until the component remounts. The ordinary path hides
 * this, because an invalidation moves a defined value to `undefined` and that
 * transition is itself the trigger. The path that has no value to begin with
 * has no transition, and nothing wakes it.
 *
 * So every notification bumps this, and readers depend on it. A notify with no
 * value in hand now re-asks; `ensureKnobSnapshot` de-duplicates, so a reader
 * that already has a fresh answer pays nothing (found by Cursor Bugbot on
 * PR 238, 2026-09-20 — and it was the exact claim the give-up branch's own
 * comment made without proving it).
 */
let storeVersion = 0;

function notify(): void {
  storeVersion += 1;
  for (const listener of listeners) listener();
}

/**
 * 🚨 A KNOB'S ADDRESS IS THE PAIR, NEVER A STRING A HELPER RE-GUESSES
 * (VERIFY-U-P2-R4, V13-2). `platform.knob_resolve` takes `(p_feature, p_key)`
 * and `platform.feature_knob`'s primary key IS that pair — and neither half is
 * recoverable from one dotted string: live on 2026-09-17, 635 of 812 rows have a
 * dot INSIDE `feature` (`media.listening` + `voice`) and 58 have one inside
 * `key` (`connectors` + `prompt.resurface_days`). The connector prompt card read
 * `"connectors.prompt.resurface_days"`, the last-dot split sent
 * `('connectors.prompt','resurface_days')`, the database answered
 * `P0001 knob connectors.prompt.resurface_days is not seeded`, and the raise died
 * in an empty catch — so the knob PLAN §7 rules could never resolve and nothing
 * on any screen said so.
 *
 * A caller passes the register's own pair. The dotted string stays as a
 * convenience for the majority of rows whose feature is everything before the
 * last dot, and that convention is no longer assumed: every call site in the
 * repo is resolved through this function and matched against the declared rows
 * by `__tests__/every-knob-read-addresses-a-real-row.test.ts`.
 */
export interface KnobAddress {
  feature: string;
  key: string;
}

/** The pair, or the dotted convenience form of it. */
export type KnobRef = string | KnobAddress;

/** THE ONE PLACE A REF BECOMES THE PAIR THE RESOLVER SENDS. */
export function knobAddress(ref: KnobRef): KnobAddress {
  if (typeof ref !== "string") return { feature: ref.feature, key: ref.key };
  const at = ref.lastIndexOf(".");
  if (at <= 0 || at === ref.length - 1) {
    throw new Error(
      `knob "${ref}" has no feature segment — a knob is addressed by the register's ` +
        "own (feature, key) pair; pass { feature, key }.",
    );
  }
  return { feature: ref.slice(0, at), key: ref.slice(at + 1) };
}

/** The cache/invalidation address — unambiguous in this direction only. */
function fullKeyOf(ref: KnobRef): string {
  return typeof ref === "string" ? ref : `${ref.feature}.${ref.key}`;
}

/**
 * The cached effective value, or `undefined` when this (organization, user,
 * scope) snapshot has not landed yet — or when it landed and carries no such
 * address at all. Callers treat `undefined` as "not answered", never as a
 * value; the unseeded case is named, loudly, by `ensureEffectiveKnob`.
 */
export function peekEffectiveKnob(
  organizationId: string | null | undefined,
  userId: string | null | undefined,
  ref: KnobRef,
  scopes?: readonly KnobScope[],
): unknown {
  drainBootSeeds();
  const snapshot = snapshots.get(snapshotAddr(organizationId ?? null, userId ?? null, scopes));
  if (!snapshot) return undefined;
  const value = snapshot.resolved[fullKeyOf(ref)];
  // Config attestation: once per (address, snapshot) — a Set lookup here, the rest after render.
  if (value !== undefined) noteKnobReadOnce(snapshot, ref, value);
  return value;
}

/**
 * 🚨 KNOB RESOLUTION NEVER BLOCKS A READ (Arman, 2026-09-29: filters and
 * settings, never permissions). `organizationId` may be `null`: the server
 * (`platform.knob_snapshot`, `p_organization_id` null) then resolves user
 * override → platform default and simply skips the organization layer. A page
 * size or any other knob is therefore always answerable, with or without a
 * selected organization; when one IS selected its override still wins.
 *
 * Fetch (once) the whole resolved register for this person in this
 * organization, then answer from it. Concurrent callers — the five knobs one
 * surface reads on mount, and every other surface mounted beside it — share
 * the ONE call.
 */
export function ensureEffectiveKnob(
  organizationId: string | null,
  userId: string | null,
  ref: KnobRef,
  scopes?: readonly KnobScope[],
): Promise<unknown> {
  // SIGNED OUT: `platform.knob_snapshot` answers 42501 to anon, and a refused read is a
  // system_error row per visitor. "Not answered" is `undefined` — exactly what a reader
  // holds before the read lands — so the consumer keeps its own default; nothing is cached.
  if (isSignedOutVisitor()) return Promise.resolve(undefined);
  const fullKey = fullKeyOf(ref);
  return ensureKnobSnapshot(organizationId, userId, scopes).then((snapshot) => {
    if (!(fullKey in snapshot.resolved)) {
      // 🚨 A KNOB THAT IS NOT SEEDED IS A NAMED FAILURE WITH A REMEDY, never a
      // default nobody chose (law 4). The snapshot carries a row for EVERY
      // registered knob, so an address it does not hold is not seeded — the
      // same condition `knob_resolve` raised `P0001 … is not seeded` for, now
      // decided locally and with the pair spelled out.
      const { feature, key } = knobAddress(ref);
      throw new Error(
        `no knob is registered for feature='${feature}', key='${key}' ` +
          `(read as "${fullKey}"): platform.knob_snapshot answered for this ` +
          "organization and carries no such address. Either the row is not " +
          "seeded — seed it in a platform.feature_knob migration — or the " +
          "address is wrong: pass the register's own { feature, key } pair, " +
          "never a dotted string a helper has to re-split.",
      );
    }
    noteKnobReadOnce(snapshot, ref, snapshot.resolved[fullKey]);
    return snapshot.resolved[fullKey];
  });
}

/** True only when the app store exists and holds no signed-in identity (never for a bare harness). */
export function isSignedOutVisitor(): boolean {
  const store = getStoreSingleton();
  if (!store) return false;
  return !(store.getState() as { userAuth?: { id: string | null } }).userAuth?.id;
}

type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
type PlatformRpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

/**
 * 🚨 THE PLATFORM VALUES ARE SHIPPED ONCE, THE PERSON'S ANSWER IS A DIFFERENCE (KNOB-SNAPSHOT, 2026-10-08).
 * `platform.knob_snapshot` resolved all ~3,900 knobs one function call at a time (2.5-3.9 s, 214 kB) to tell
 * a person that all but a handful equal the platform value. Now `platform.knob_defaults` carries the platform
 * values (a ~214 kB read keyed by a content version, kept in memory and localStorage, re-read only when an
 * admin edits a default) and `platform.knob_snapshot_delta` carries only the keys this person's ladder
 * moves (about 0.5 kB) plus an etag. `resolved` below is `{...defaults, ...overrides}` — the exact map the
 * old call returned (proven equal per person by scripts/campaign-tests/knobsnapshot_equivalence.sql).
 *
 * DB LANE A2 (2026-10-21): every knob write used to move the one defaults version, so every tab re-read the
 * whole ~200 kB map (97/min). The register now travels in 64 buckets by feature (`bucket → feature → key`,
 * migrations/dblanea2_knob_register_ships_in_64_buckets.sql): the held copy's vector rides in `p_etag`, and a
 * write answers with only the changed buckets, which replace the held ones whole (so a deleted key leaves).
 * The helpers are `@ai-matrx/data/knobs`'s, shared with its `createKnobReader`.
 */
type DefaultsEntry = KnobDefaults;
const storedDefaultsKey = defineClientKey({
  id: "knobs.defaults.v1",
  area: "local",
  kind: "cache",
  reason: "Copy of the platform knob defaults keyed by version; a stale copy is only a miss.",
});
let defaultsCache: DefaultsEntry | null = null;
let defaultsInFlight: Promise<DefaultsEntry> | null = null;

/** What the last answer for an address was, kept ACROSS invalidations: the etag is a content hash, so a stale one is merely a miss. */
const lastAnswers = new Map<
  string,
  { etag: string; resolved: Record<string, unknown>; overrides: Record<string, unknown>; defaultsVersion: string }
>();

/** What each held etag was asked with, so the catch-up below can ask the same question again. */
const heldAsks = new Map<
  string,
  { organizationId: string | null; userId: string | null; scopes: readonly KnobScope[] | undefined; deviceId: string | null }
>();

/** Stored as buckets when held as buckets (the flat map is rebuilt on read, not stored twice). */
type StoredDefaults = { version: string; vector?: string; buckets?: KnobBuckets; values?: Record<string, unknown> };

function readStoredDefaults(): DefaultsEntry | null {
  const parsed = storedDefaultsKey.getJSON<StoredDefaults>();
  if (!parsed || typeof parsed.version !== "string") return null;
  if (parsed.buckets && parsed.vector) {
    return { version: parsed.version, vector: parsed.vector, buckets: parsed.buckets, values: flattenKnobBuckets(parsed.buckets) };
  }
  return parsed.values ? { version: parsed.version, values: parsed.values } : null;
}

function storeDefaults(entry: DefaultsEntry): void {
  // Storage full or blocked: the in-memory copy still serves this tab.
  const stored: StoredDefaults =
    entry.buckets && entry.vector
      ? { version: entry.version, vector: entry.vector, buckets: entry.buckets }
      : { version: entry.version, values: entry.values };
  storedDefaultsKey.setJSON(stored);
}

function keepDefaults(entry: DefaultsEntry): DefaultsEntry {
  defaultsCache = entry;
  storeDefaults(entry);
  return entry;
}

/** One `knob_defaults` read: the held copy, a patched copy, a flat copy, or null for a patch it cannot apply. */
async function askDefaults(rpc: PlatformRpc, held: DefaultsEntry | null, asked: string): Promise<DefaultsEntry | null> {
  const { data, error } = await rpc("knob_defaults", { p_known_version: asked });
  if (error) {
    throw new Error(
      `platform.knob_defaults could not answer: ${error.message}. Every setting on this screen is ` +
        "falling back to its consumer's own default until it can.",
    );
  }
  return knobDefaultsFromAnswer(held, asked, (data ?? {}) as Parameters<typeof knobDefaultsFromAnswer>[2]);
}

function platformRpc(supabase: ReturnType<typeof createClient>): PlatformRpc {
  const schema = supabase.schema("platform") as unknown as { rpc: PlatformRpc };
  return (name, args) => schema.rpc(name, args);
}

/** The platform values, from memory, then localStorage, then one `knob_defaults` read that is skipped when the version still matches. */
async function ensureDefaults(
  rpc: PlatformRpc,
  wantVersion: string | null,
): Promise<DefaultsEntry> {
  defaultsCache = defaultsCache ?? readStoredDefaults();
  if (defaultsCache && (wantVersion === null || defaultsCache.version === wantVersion)) {
    return defaultsCache;
  }
  if (defaultsInFlight) return defaultsInFlight;
  const run = (async () => {
    try {
      const held = defaultsCache;
      // The held vector asks for only the buckets that moved; a cold browser asks for every bucket.
      const next =
        (await askDefaults(rpc, held, knobDefaultsAsk(held))) ??
        (await askDefaults(rpc, null, KNOB_DEFAULTS_BUCKETED));
      if (!next) {
        throw new Error(
          "platform.knob_defaults answered neither the register nor a whole set of buckets. Every setting " +
            "on this screen is falling back to its consumer's own default until it can.",
        );
      }
      return next === held ? next : keepDefaults(next);
    } finally {
      defaultsInFlight = null;
    }
  })();
  defaultsInFlight = run;
  return run;
}

/**
 * 🚨 THE FAILURE SAYS WHAT HAPPENED, NOT WHAT USUALLY HAPPENS (2026-10-10). This sentence used to end
 * "A 42501 here means the signed-in person is not a member of that organization" on EVERY failure and
 * print `organization='null'` for a read with no organization, so a dropped request ("Failed to fetch")
 * read as "organization-scoped knob reads return 42501 when the organization is null" — a defect that
 * does not exist: with no organization the server skips the organization rung and answers the platform
 * values plus the person's own settings. Only a real 42501 is explained, and by the case it is.
 */
export function snapshotFailureSentence(
  organizationId: string | null,
  error: { message: string; code?: string },
): string {
  const where = organizationId
    ? `organization='${organizationId}'`
    : "no organization (platform values and this person's own settings)";
  const code = error.code ? ` [${error.code}]` : "";
  const why =
    error.code !== "42501"
      ? ""
      : organizationId
        ? " The signed-in person is not a member of that organization; the read is gated on membership by design."
        : " With no organization only a read without a signed-in session is refused: this ran as a signed-out visitor.";
  return (
    `platform.knob_snapshot_delta could not answer for ${where}: ${error.message}${code}.${why} ` +
    "Every setting on this screen is falling back to its consumer's own default until it can."
  );
}

/** One small round trip (plus the defaults read on a cold browser). No caching, no races — the caller owns both. */
async function fetchKnobSnapshot(
  supabase: ReturnType<typeof createClient>,
  organizationId: string | null,
  userId: string | null,
  scopes: readonly KnobScope[] | undefined,
  deviceId: string | null,
): Promise<Snapshot> {
  // `knob_snapshot_delta` / `knob_defaults` are not in `types/database.types.ts` yet: the RPC names are cast
  // in `platformRpc` and nowhere else. Remedy: `pnpm db-types` from an environment that has the service
  // key, then type the calls.
  const rpc = platformRpc(supabase);
  const addr = snapshotAddr(organizationId, userId, scopes);
  const prior = lastAnswers.get(addr);
  // Start the defaults read beside the delta on a cold browser; it is skipped when the cache is warm.
  const warmDefaults = defaultsCache ?? readStoredDefaults();
  if (warmDefaults && !defaultsCache) defaultsCache = warmDefaults;
  const defaultsEarly = warmDefaults ? null : ensureDefaults(rpc, null);
  // The address's fingerprint with the vector the held defaults are at: a register write answers with
  // only the buckets that moved since (`defaults_patch`), never the whole map.
  const sentEtag = knobEtagFor(prior?.etag, warmDefaults);
  // Started beside the delta and awaited only on the path that needs it. When the delta throws first (no
  // session yet: both calls ride the anon role and answer 42501) nothing awaits this one, and its rejection
  // surfaced as an uncaught page error on every Applet page. The delta's own error is the one reported.
  defaultsEarly?.catch(() => undefined);
  const { data, error } = await rpc("knob_snapshot_delta", {
    // NULL, sent explicitly: `p_organization_id` has NO default in the SQL
    // signature, so OMITTING it makes PostgREST answer 404 (no function matches).
    p_organization_id: organizationId ?? null,
    p_user_id: userId ?? undefined,
    p_scopes: buildScopes(deviceId, scopes),
    p_etag: sentEtag,
  });
  if (error) throw new Error(snapshotFailureSentence(organizationId, error));
  const payload = (data ?? {}) as Parameters<typeof knobDeltaPatch>[0] & {
    etag?: string;
    unchanged?: boolean;
    overrides?: Record<string, unknown>;
  };
  if (payload.unchanged && prior && sentEtag && payload.etag === sentEtag) {
    // The defaults may have been patched under another address since this answer was built.
    const held = defaultsCache;
    const resolved =
      held && held.version !== prior.defaultsVersion ? { ...held.values, ...prior.overrides } : prior.resolved;
    lastAnswers.set(addr, { ...prior, etag: sentEtag, resolved, defaultsVersion: held?.version ?? prior.defaultsVersion });
    return { resolved, stamp: sentEtag, at: Date.now() };
  }
  const patch = knobDeltaPatch(payload, sentEtag);
  const patched = patch ? applyKnobDefaultsPatch(defaultsCache, patch) : null;
  const defaults = patched
    ? keepDefaults(patched)
    : await (defaultsEarly ?? ensureDefaults(rpc, payload.defaults_version ?? null));
  const overrides = payload.overrides ?? {};
  const resolved = { ...defaults.values, ...overrides };
  if (payload.etag) {
    lastAnswers.set(addr, { etag: payload.etag, resolved, overrides, defaultsVersion: defaults.version });
    heldAsks.set(addr, { organizationId, userId, scopes, deviceId });
  }
  return { resolved, stamp: payload.etag ?? null, at: Date.now() };
}

/**
 * THE ONE NETWORK READ. Everything a screen asks about settings is answered
 * from what this returns; nothing in this repo resolves a single knob over the
 * wire (guard: `pnpm check:knob-snapshot-adoption`).
 */
export function ensureKnobSnapshot(
  organizationId: string | null,
  userId: string | null,
  scopes?: readonly KnobScope[],
): Promise<Snapshot> {
  drainBootSeeds(); // a streamed boot snapshot that has arrived answers first
  const id = snapshotAddr(organizationId, userId, scopes);
  const hit = snapshots.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit);
  const pending = inFlight.get(id);
  if (pending) return pending;
  const supabase = createClient();
  // THIS browser's device rung (USD-9) rides as a scope so a device-level
  // override (nearest rung of all) wins here exactly as it does on the
  // settings screen (`knob_index` takes it as `p_device_id`).
  const deviceId = getWebDeviceId();
  // A token, not the promise itself: the `finally` below must ask "is the
  // entry under this address still MINE?", and comparing against `run` inside
  // its own initializer is not something the compiler will vouch for.
  const mine: { promise?: Promise<Snapshot> } = {};
  const run = (async () => {
    try {
      for (let attempt = 0; ; attempt += 1) {
        const askedAt = generation;
        const snapshot = await fetchKnobSnapshot(
          supabase,
          organizationId,
          userId,
          scopes,
          deviceId,
        );
        if (generation === askedAt) {
          snapshots.set(id, snapshot);
          notify();
          return snapshot;
        }
        // A write landed while this was in flight. The answer in hand predates
        // it, so it is never cached; ask again for one that does not.
        if (attempt >= MAX_RACE_RETRIES) {
          // Writes are still arriving faster than a round trip. Hand this
          // caller the newest answer we have WITHOUT caching it, so the next
          // read starts clean rather than inheriting a value we know is
          // behind.
          //
          // 🚨 THIS COMMENT ONCE CLAIMED MORE THAN THE CODE DID. It said
          // "`useEffectiveKnob` sees `undefined`, re-runs its effect and
          // re-fetches — it self-heals", and that was FALSE: the hook re-runs
          // on a change in its dependencies, and an `undefined` that stays
          // `undefined` is not a change, so a reader that never had a value sat
          // on its consumer's default until it remounted. The claim is true now
          // only because `notify` bumps `storeVersion` and the hook depends on
          // it — see the note beside `notify`. A stand-in that says it recovers
          // has to be the thing that recovers (law 4).
          console.warn(
            `[knob] gave up re-reading platform.knob_snapshot for organization='${organizationId}' ` +
              `after ${MAX_RACE_RETRIES} writes landed mid-flight. The answer returned is not ` +
              "cached, so the next read fetches a fresh one.",
          );
          // Retire the entry BEFORE notifying, not in the `finally` afterwards:
          // the notification is what makes mounted readers re-ask, and a reader
          // that re-asks while this promise is still registered would simply
          // join it and receive the same pre-write answer again.
          if (inFlight.get(id) === mine.promise) inFlight.delete(id);
          notify();
          return snapshot;
        }
      }
    } finally {
      // Only retire OUR entry: an invalidation may have cleared the map and a
      // newer fetch may already be registered under this address.
      if (inFlight.get(id) === mine.promise) inFlight.delete(id);
    }
  })();
  mine.promise = run;
  inFlight.set(id, run);
  return run;
}

/** What `platform.knob_snapshot_delta` answered, read by the (core) layout for this page load. */
export interface KnobSnapshotSeed {
  organizationId: string | null;
  userId: string;
  /** The device rung the server addressed (this browser's id, from its cookie mirror). */
  deviceId: string | null;
  payload: { etag?: string; defaults_version?: string; overrides?: Record<string, unknown> };
}

/**
 * 🚨 THE BOOT SEED (first-paint fetch contract G2). The (core) layout already asked
 * `knob_snapshot_delta` for the organization the load ladder predicts; when this tab lands on that
 * same (organization, person, device) address the answer is installed with no request. Any other
 * address — another organization chosen by this tab or a link, another device id — is not touched,
 * and its readers fetch as before. A snapshot or fetch already present wins; an invalidation since
 * (a knob write, the server-bus `settings_changed` directive) drops it exactly like a fetched one.
 * The platform values come from this browser's stored copy when its version matches; otherwise the
 * one `knob_defaults` read runs (a cold browser), and `knob_snapshot_delta` still does not.
 */
export function primeKnobSnapshot(seed: KnobSnapshotSeed): void {
  if (typeof window === "undefined") return;
  if ((seed.deviceId ?? null) !== (getWebDeviceId() ?? null)) return;
  const id = snapshotAddr(seed.organizationId, seed.userId, undefined);
  if (snapshots.has(id) || inFlight.has(id)) return;
  const askedAt = generation;
  const build = (defaults: DefaultsEntry): Snapshot => {
    const overrides = seed.payload.overrides ?? {};
    const resolved = { ...defaults.values, ...overrides };
    if (seed.payload.etag) {
      lastAnswers.set(id, { etag: seed.payload.etag, resolved, overrides, defaultsVersion: defaults.version });
      heldAsks.set(id, { organizationId: seed.organizationId, userId: seed.userId, scopes: undefined, deviceId: seed.deviceId });
    }
    return { resolved, stamp: seed.payload.etag ?? null, at: Date.now() };
  };
  const want = seed.payload.defaults_version ?? null;
  const warm = defaultsCache ?? readStoredDefaults();
  if (warm && (want === null || warm.version === want)) {
    defaultsCache = warm;
    snapshots.set(id, build(warm));
    // Deferred: a prime can run inside a read that a render started; readers re-render after it.
    queueMicrotask(notify);
    return;
  }
  const mine: { promise?: Promise<Snapshot> } = {};
  const run = ensureDefaults(platformRpc(createClient()), want).then(
    (defaults) => {
      const snapshot = build(defaults);
      if (generation === askedAt) {
        snapshots.set(id, snapshot);
        notify();
      }
      return snapshot;
    },
    (error: unknown) => {
      throw error instanceof Error ? error : new Error(String(error));
    },
  );
  const retire = () => {
    if (inFlight.get(id) === mine.promise) inFlight.delete(id);
  };
  mine.promise = run;
  run.then(retire, retire);
  inFlight.set(id, run);
}

// Opt in to the platform client-directive channel (Lane E, 2026-09-11): an
// `instant` key changed somewhere — another tab, another admin, the server —
// so forget it here and let every mounted reader re-resolve. Module-level
// registration, once per tab; the registry ignores a signed-out tab.
if (typeof window !== "undefined") {
  registerDirectiveHandler("settings_changed", (payload) => {
    invalidateEffectiveKnob(`${payload.feature}.${payload.key}`);
  });
  installFocusRecheck();
}

/**
 * Refetch on focus, never a blind poll: a tab that was hidden for at least
 * KNOB_FOCUS_RECHECK_AFTER_MS asks each held snapshot "unchanged?" once when it
 * is shown again, and drops the caches only if one moved.
 */
function installFocusRecheck(): void {
  let hiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (away < KNOB_FOCUS_RECHECK_AFTER_MS || isSignedOutVisitor()) return;
    void catchUpKnobsSinceBoot().catch((error: unknown) => {
      console.warn("[knob] re-check on return to the tab could not ask:", error);
    });
  };
  document.addEventListener("visibilitychange", onVisibility);
}

/**
 * CATCH-UP FOR A DIRECTIVE THAT FIRED BEFORE THE ROOMS JOINED. The server-bus rooms join after late
 * idle, so a `settings_changed` sent in the first seconds is lost. The page's own boot read holds two
 * versions — the platform defaults' content version and each snapshot's etag — and both questions are
 * conditional: "unchanged" answers carry no payload. Returns true (after dropping the held snapshots)
 * only when one of them moved. No held version = nothing to compare = no read at all.
 */
export async function catchUpKnobsSinceBoot(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const defaults = defaultsCache ?? readStoredDefaults();
  if (defaults && !defaultsCache) defaultsCache = defaults;
  if (!defaults && heldAsks.size === 0) return false;
  const rpc = platformRpc(createClient());
  let moved = false;
  // A held snapshot's etag carries the register vector (`k4.<inputs>.<vector>`, dblanea2; was k3 in
  // migration dblanea_knob_delta_unchanged_is_cheap): "unchanged" there means the defaults did not move
  // either, so the full defaults read (~80 ms server-side) is asked only when no snapshot is held.
  const holdsSnapshot = [...heldAsks.keys()].some((addr) => lastAnswers.has(addr));
  if (defaults?.version && !holdsSnapshot) {
    const asked = knobDefaultsAsk(defaults);
    const { data, error } = await rpc("knob_defaults", { p_known_version: asked });
    if (!error && (data as { unchanged?: boolean } | null)?.unchanged !== true) {
      moved = true;
      const next = knobDefaultsFromAnswer(defaults, asked, (data ?? {}) as Parameters<typeof knobDefaultsFromAnswer>[2]);
      if (next && next !== defaults) keepDefaults(next);
    }
  }
  for (const [addr, ask] of heldAsks) {
    if (moved) break;
    const prior = lastAnswers.get(addr);
    if (!prior) continue;
    const sent = knobEtagFor(prior.etag, defaultsCache);
    const { data, error } = await rpc("knob_snapshot_delta", {
      p_organization_id: ask.organizationId ?? null,
      p_user_id: ask.userId ?? undefined,
      p_scopes: buildScopes(ask.deviceId, ask.scopes),
      p_etag: sent,
    });
    if (error) continue;
    const answer = (data ?? {}) as Parameters<typeof knobDeltaPatch>[0] & { unchanged?: boolean; etag?: string };
    if (answer.unchanged !== true || answer.etag !== sent) {
      moved = true;
      // Keep the buckets this answer carried, so the re-read after the drop asks for nothing again.
      const patch = knobDeltaPatch(answer, sent);
      const patched = patch ? applyKnobDefaultsPatch(defaultsCache, patch) : null;
      if (patched) keepDefaults(patched);
    }
  }
  if (moved) invalidateEffectiveKnob();
  return moved;
}

/**
 * Forget the cached answers. The unit of caching is the SNAPSHOT, so one knob
 * changing drops the snapshots that could be carrying it and the next read
 * re-fetches one — one call, not one per knob, which is the whole point. The
 * `ref` is kept in the signature because every caller has one and it makes the
 * intent readable at the call site; it deliberately does not narrow the drop.
 */
export function invalidateEffectiveKnob(_ref?: KnobRef): void {
  // The bump is the half that a `clear()` alone cannot do: it tells every
  // fetch already in flight that its answer is now historical, so none of them
  // can reinstall the pre-write register behind this call. Dropping the
  // in-flight entries as well means a reader arriving after this point starts
  // its own fetch rather than joining one that began before the write.
  generation += 1;
  // A streamed boot seed that has not drained yet predates this write: it is never installed.
  if (typeof window !== "undefined") delete (window as unknown as Record<string, unknown>)[STREAMED_KNOB_SEED_GLOBAL];
  snapshots.clear();
  inFlight.clear();
  notify();
}

export function subscribeEffectiveKnob(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function effectiveKnobStoreVersion(): number {
  return storeVersion;
}

/** Bumps only when a knob is WRITTEN (`invalidateEffectiveKnob`) — never when an answer arrives. */
export function effectiveKnobWriteGeneration(): number {
  return generation;
}
