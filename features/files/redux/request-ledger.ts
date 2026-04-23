/**
 * features/files/redux/request-ledger.ts
 *
 * In-memory correlation map between client-generated `requestId`s (attached to
 * every mutation via X-Request-Id) and the realtime payloads they echo.
 *
 * USE
 * ---
 * - Thunks call `registerRequest({ requestId, kind, resourceId, resourceType })`
 *   before dispatching a REST write. The optimistic reducer has already
 *   applied the change locally.
 * - The realtime middleware calls `consumeIfOwnEcho(payload)` on every incoming
 *   event. If the payload's `metadata.request_id` matches a live ledger
 *   entry, it's our own echo — skip the dispatch. Otherwise the change came
 *   from elsewhere (server, other device, share-link visitor) and we apply it.
 * - Entries expire automatically after 30s so stale ids don't swallow
 *   legitimate later updates to the same resource. Thunks also explicitly
 *   `releaseRequest(requestId)` once the REST call returns (success or error).
 *
 * NOTE on dedup fallback
 * ----------------------
 * The current Python backend may or may not thread X-Request-Id through to the
 * realtime payload (see PYTHON_TEAM_COMMS.md). Until it does, we also expose
 * `findRecentOwnWrite` for timestamp-fuzzy matching within ~2s of a recent
 * own write to the same resource_id.
 */

import type { LedgerEntry, RequestKind, ResourceType } from "../types";

const ENTRY_TTL_MS = 30_000;
const FUZZY_WINDOW_MS = 2_000;

type EntryWithTimer = LedgerEntry & { _timer: ReturnType<typeof setTimeout> };

const ledger = new Map<string, EntryWithTimer>();

/**
 * Quick accessor for the full map size — used in DevTools / diagnostics only.
 */
export function ledgerSize(): number {
  return ledger.size;
}

export interface RegisterArgs {
  requestId: string;
  kind: RequestKind;
  resourceId: string | null;
  resourceType: ResourceType | null;
}

export function registerRequest(args: RegisterArgs): void {
  // If this id is already in flight (unlikely — UUIDs), refresh the timer.
  releaseRequest(args.requestId);

  const entry: EntryWithTimer = {
    requestId: args.requestId,
    kind: args.kind,
    resourceId: args.resourceId,
    resourceType: args.resourceType,
    createdAt: Date.now(),
    _timer: setTimeout(() => {
      ledger.delete(args.requestId);
    }, ENTRY_TTL_MS),
  };
  ledger.set(args.requestId, entry);
}

export function releaseRequest(requestId: string): void {
  const existing = ledger.get(requestId);
  if (!existing) return;
  clearTimeout(existing._timer);
  ledger.delete(requestId);
}

/**
 * Returns the entry if the given id is a known in-flight request, otherwise
 * null. Does NOT release it — the thunk is responsible for explicit release
 * on REST completion.
 */
export function getEntry(requestId: string): LedgerEntry | null {
  const e = ledger.get(requestId);
  if (!e) return null;
  const { _timer: _t, ...rest } = e;
  return rest;
}

/**
 * Checks a realtime payload for an own-echo match via the primary path
 * (explicit `request_id` in the row metadata) and — as fallback — a
 * timestamp-fuzzy match against recent own writes to the same resource.
 *
 * Returns true if the caller should SKIP this payload (it's our own echo).
 */
export function isOwnEcho(payload: {
  requestId: string | null;
  resourceId: string | null;
  resourceType: ResourceType | null;
}): boolean {
  if (payload.requestId && ledger.has(payload.requestId)) {
    return true;
  }
  // Fallback path — if the backend doesn't echo request_id, approximate.
  if (payload.resourceId) {
    return findRecentOwnWrite(
      payload.resourceId,
      payload.resourceType,
      FUZZY_WINDOW_MS,
    );
  }
  return false;
}

/**
 * Fuzzy match: any entry against the same resource within `windowMs`.
 */
export function findRecentOwnWrite(
  resourceId: string,
  resourceType: ResourceType | null,
  windowMs: number = FUZZY_WINDOW_MS,
): boolean {
  const cutoff = Date.now() - windowMs;
  for (const entry of ledger.values()) {
    if (entry.resourceId !== resourceId) continue;
    if (resourceType && entry.resourceType && entry.resourceType !== resourceType)
      continue;
    if (entry.createdAt >= cutoff) return true;
  }
  return false;
}

/** Test/debug helper. */
export function clearLedger(): void {
  for (const entry of ledger.values()) clearTimeout(entry._timer);
  ledger.clear();
}
