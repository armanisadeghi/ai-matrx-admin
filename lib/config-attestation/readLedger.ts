/**
 * The web app's config-read ledger — the OBSERVED half of config attestation (lane
 * CONFIG-ATTEST-ROLLOUT, 2026-10-15; system of record:
 * common-docs/systems/platform/app-config/attestation/FEATURE.md).
 *
 * Knob and app-config getters call `noteConfigRead` from hot paths — `useSyncExternalStore`
 * getSnapshot and render among them — so this module does NO work there beyond an array push:
 * no Date, no hashing, no storage. Everything is handed to the recorder in a microtask
 * (`queueMicrotask`), after render. It imports nothing at run time, so any reader can depend on it
 * without a cycle. The recorder (recorder.client.ts) attaches itself once a signed-in browser has
 * its install row; reads that happen before that wait in a capped queue (drops are counted).
 */
import type { ConfigReadRecorder } from "@ai-matrx/data/config-attestation";

type Kind = "knob" | "app_config";
type Source = "db" | "cache" | "snapshot" | "env";

interface Pending {
  kind: Kind;
  feature: string | null;
  key: string;
  source: Source;
  invalid: boolean;
  value: unknown;
}

/** Reads kept before the recorder attaches; beyond this the oldest are dropped and counted. */
export const PRESTART_QUEUE_CAP = 5_000;

/** Every stand-in and drop on this path, counted (law 4: nothing fails silently). */
export const configAttestationCounters = {
  reads: 0,
  /** Reads dropped because the pre-start queue was full. */
  queue_drops: 0,
  /** Unsent report buckets dropped because the local spool hit its size cap. */
  spool_drops: 0,
  /** Page loads where no build sha was known, so nothing could be attributed. */
  missing_sha: 0,
  /** Failed attempts to register this browser's install row. */
  register_failures: 0,
};

let queue: Pending[] = [];
let scheduled = false;
let recorder: ConfigReadRecorder | null = null;
let disabled = false;

function drain(): void {
  scheduled = false;
  if (!recorder) {
    if (queue.length > PRESTART_QUEUE_CAP) {
      const over = queue.length - PRESTART_QUEUE_CAP;
      queue = queue.slice(over);
      configAttestationCounters.queue_drops += over;
    }
    return;
  }
  const batch = queue;
  queue = [];
  for (const r of batch) {
    recorder.read({ kind: r.kind, feature: r.feature, key: r.key, source: r.source, invalid: r.invalid, value: r.value });
  }
}

/** Count one read. Safe in render: a push and (at most once per tick) a microtask. */
export function noteConfigRead(
  kind: Kind,
  feature: string | null,
  key: string,
  source: Source,
  value?: unknown,
  invalid = false,
): void {
  if (disabled) return;
  configAttestationCounters.reads += 1;
  queue.push({ kind, feature, key, source, invalid, value });
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(drain);
  }
}

/**
 * Count a knob read once per (address, snapshot): `peekEffectiveKnob` runs on every render of
 * every subscriber, so the same answer is one read, not hundreds. A WeakMap keyed by the snapshot
 * object, so a dropped snapshot frees its set.
 */
const seenBySnapshot = new WeakMap<object, Set<string>>();
export function noteKnobReadOnce(
  snapshot: object,
  ref: string | { feature: string; key: string },
  value: unknown,
): void {
  if (disabled) return;
  const id = typeof ref === "string" ? ref : `${ref.feature}\u0000${ref.key}`;
  let seen = seenBySnapshot.get(snapshot);
  if (!seen) {
    seen = new Set();
    seenBySnapshot.set(snapshot, seen);
  } else if (seen.has(id)) return;
  seen.add(id);
  if (typeof ref !== "string") return noteConfigRead("knob", ref.feature, ref.key, "db", value);
  // The dotted form splits at the LAST dot, exactly like `knobAddress` and the manifest scanner,
  // so a mis-split key shows red on both sides rather than hiding.
  const at = ref.lastIndexOf(".");
  if (at <= 0) return;
  noteConfigRead("knob", ref.slice(0, at), ref.slice(at + 1), "db", value);
}

/** Called by the recorder once it can file reports; drains everything queued so far. */
export function attachConfigReadRecorder(r: ConfigReadRecorder | null): void {
  recorder = r;
  if (r && queue.length && !scheduled) {
    scheduled = true;
    queueMicrotask(drain);
  }
}

/** Server-side and tests: stop counting entirely (no queue growth where nothing will ever flush). */
export function disableConfigReadLedger(): void {
  disabled = true;
  queue = [];
}

/** Tests only. */
export function __resetConfigReadLedger(): void {
  queue = [];
  scheduled = false;
  recorder = null;
  disabled = false;
  for (const k of Object.keys(configAttestationCounters) as Array<keyof typeof configAttestationCounters>) configAttestationCounters[k] = 0;
}
