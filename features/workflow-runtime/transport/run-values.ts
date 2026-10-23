/**
 * A run's BY-REFERENCE values — the ONE fetch path (MKT-167).
 *
 * The server keeps every large value a workflow event carries (a step's inputs,
 * a big output child, the run's last outputs) ONCE per run and puts
 * `{"__matrx_checkpoint_value__": "<sha256>"}` in its place. The event log stays
 * small, so reopening a run no longer loads tens of megabytes. A screen that SHOWS
 * a value — a step's readout, Watch AI, the Builder, the provision window, step
 * detail — resolves it here, when it opens: `useRunValue(runId, value)`.
 *
 * A reference never changes what it names (a large value's is its content hash, a held
 * value's an opaque id), so a resolved one is cached; the cache keeps
 * the most recent ones and drops the oldest past `CACHE_MAX_BYTES`.
 */

import { getJson } from "@/lib/python-client";
import { withRunDebugView } from "./debug-view";

/** Must equal matrx_graph.checkpoint.values.REF_KEY. */
export const RUN_VALUE_REF_KEY = "__matrx_checkpoint_value__";
/**
 * Must equal matrx_graph.checkpoint.value_store.HELD_KEY: a value a step holds on the
 * server (a provision). Only an admin in debug mode ever receives one (MKT-167 part 2).
 * Its reference is OPAQUE (random, never a digest of the value — a small snapshot's hash
 * would reveal it); it resolves only through `GET /runs/{id}/values`, like any ref here.
 */
export const RUN_VALUE_HELD_KEY = "__matrx_held_value__";

/** Hashes asked for in one request (the server reads at most 200). */
const HASHES_PER_READ = 100;
/** Approximate cap on cached value text, in characters. */
const CACHE_MAX_BYTES = 24 * 1024 * 1024;

export function runValueRef(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || (keys[0] !== RUN_VALUE_REF_KEY && keys[0] !== RUN_VALUE_HELD_KEY)) return null;
  const ref = (value as Record<string, unknown>)[keys[0]];
  return typeof ref === "string" && ref ? ref : null;
}

/** Every reference `value` carries (not following them). */
export function collectRunValueRefs(value: unknown, into: Set<string> = new Set()): Set<string> {
  const stack: unknown[] = [value];
  while (stack.length) {
    const item = stack.pop();
    if (!item || typeof item !== "object") continue;
    const ref = runValueRef(item);
    if (ref) {
      into.add(ref);
      continue;
    }
    if (Array.isArray(item)) stack.push(...item);
    else stack.push(...Object.values(item as Record<string, unknown>));
  }
  return into;
}

export function hasRunValueRefs(value: unknown): boolean {
  return collectRunValueRefs(value).size > 0;
}

/** `value` with each known reference replaced; unknown ones stay as they are. */
export function substituteRunValues<T>(value: T, store: ReadonlyMap<string, unknown>): T {
  const walk = (item: unknown): unknown => {
    if (!item || typeof item !== "object") return item;
    const ref = runValueRef(item);
    if (ref) return store.has(ref) ? store.get(ref) : item;
    if (Array.isArray(item)) {
      let changed = false;
      const out = item.map((child) => {
        const next = walk(child);
        if (next !== child) changed = true;
        return next;
      });
      return changed ? out : item;
    }
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, child] of Object.entries(item as Record<string, unknown>)) {
      const next = walk(child);
      if (next !== child) changed = true;
      out[k] = next;
    }
    return changed ? out : item;
  };
  return walk(value) as T;
}

interface RunValuesResponse {
  values: Record<string, unknown>;
  missing: string[];
}

export type RunValuesFetch = (path: string) => Promise<RunValuesResponse>;

const defaultFetch: RunValuesFetch = async (path) => {
  const { data } = await getJson<RunValuesResponse>(path);
  return data;
};

const cache = new Map<string, { value: unknown; size: number }>();
let cachedBytes = 0;
const inflight = new Map<string, Promise<void>>();

function remember(runId: string, hash: string, value: unknown): void {
  const key = `${runId}:${hash}`;
  if (cache.has(key)) return;
  const size = JSON.stringify(value)?.length ?? 0;
  cache.set(key, { value, size });
  cachedBytes += size;
  while (cachedBytes > CACHE_MAX_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value as string;
    cachedBytes -= cache.get(oldest)?.size ?? 0;
    cache.delete(oldest);
  }
}

/** The cached values for `hashes` of `runId` (what is known right now). */
export function cachedRunValues(runId: string, hashes: Iterable<string>): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const hash of hashes) {
    const hit = cache.get(`${runId}:${hash}`);
    if (hit) out.set(hash, hit.value);
  }
  return out;
}

/** Fetch every hash not yet cached. Resolves when all are cached (or reported missing). */
export async function loadRunValues(
  runId: string,
  hashes: Iterable<string>,
  fetchValues: RunValuesFetch = defaultFetch,
): Promise<Map<string, unknown>> {
  const wanted = [...new Set(hashes)].sort();
  const todo = wanted.filter((h) => !cache.has(`${runId}:${h}`) && !inflight.has(`${runId}:${h}`));
  for (let i = 0; i < todo.length; i += HASHES_PER_READ) {
    const batch = todo.slice(i, i + HASHES_PER_READ);
    const qs = batch.map((h) => `hash=${encodeURIComponent(h)}`).join("&");
    const request = fetchValues(withRunDebugView(`/runs/${runId}/values?${qs}`)).then((res) => {
      for (const [hash, value] of Object.entries(res.values ?? {})) remember(runId, hash, value);
      if (res.missing?.length) {
        throw new Error(`run ${runId.slice(0, 8)} has no stored value for ${res.missing.length} reference(s)`);
      }
    });
    const settled = request.finally(() => {
      for (const h of batch) inflight.delete(`${runId}:${h}`);
    });
    for (const h of batch) inflight.set(`${runId}:${h}`, settled);
  }
  await Promise.all(wanted.map((h) => inflight.get(`${runId}:${h}`)).filter(Boolean));
  return cachedRunValues(runId, wanted);
}

/** `value` with every reference resolved — fetching what is not cached. */
export async function resolveRunValue<T>(
  runId: string,
  value: T,
  fetchValues: RunValuesFetch = defaultFetch,
): Promise<T> {
  const refs = collectRunValueRefs(value);
  if (refs.size === 0) return value;
  const store = await loadRunValues(runId, refs, fetchValues);
  return substituteRunValues(value, store);
}

/** Test seam: forget every cached value. */
export function clearRunValueCache(): void {
  cache.clear();
  cachedBytes = 0;
  inflight.clear();
}
