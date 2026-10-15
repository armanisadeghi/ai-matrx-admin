/**
 * lib/sync/engine/remoteWrite.ts
 *
 * Debounced write sink for `warm-cache` policies. Collects slice bodies, waits
 * for quiescence (default 150ms; override via `policy.remote.debounceMs`), then
 * invokes the policy's `remote.write(ctx, body)`.
 *
 * Contract (see `phase-2-plan.md` §5.3):
 *   - Idempotent call surface — engine may call schedule() many times per
 *     debounce window; only the last payload is written.
 *   - Errors caught + logged; next change triggers a fresh write. No retry
 *     storm.
 *   - `AbortSignal` fires on: rapid re-change (abort the in-flight write),
 *     identity swap (cancel all pending + in-flight), or pagehide cleanup.
 *   - `pagehide` AND `visibilitychange` → hidden flush every write still
 *     waiting (debounce or retry backoff) without the tail. The server leg starts FIRST, synchronously,
 *     before the device leg is awaited, so the request leaves the page while
 *     it can (an `await` during unload is usually the last thing that runs).
 *   - THE UNSAVED MARKER. At that same hidden moment every `remote.write`
 *     slice still holding a pending or in-flight write is recorded in
 *     localStorage (`matrx:unsaved:<slice>` = { body, base }, identity +
 *     version stamped). It is removed when that slice's write lands with
 *     nothing newer pending. The next page booting as the same person replays
 *     it (`replayUnsavedWrites` in boot.ts): the slice shows the edit, the
 *     write is queued again on its old base, and no load lands over it.
 */

import type { Store } from "@reduxjs/toolkit";
import { extractErrorMessage } from "@/utils/errors";
import { abortByCaller } from "@/lib/diagnostics/cancelledByCaller";
// STATIC, never `import()`: the notice exists for when the network is gone,
// and a lazily-loaded chunk cannot load then (live, 2026-09-27: offline, the
// toast chunk failed ERR_INTERNET_DISCONNECTED and no notice ever showed).
import { toast } from "@/lib/toast";
// MATRX-EXCEPTION: `Policy<any>` throughout this file — same invariant-TState
// reason as lib/sync/registry.ts (partialize: readonly (keyof TState)[] makes
// TState invariant, so `Policy<unknown>` cannot accept the registry's
// heterogeneous `readonly Policy<any>[]`). Every use here only reads
// non-generic fields (config.sliceName/.version/.preset/.remote).
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IdentityKey, Policy, WriteContext } from "../types";
import { logger } from "../logger";
import { writeSlice } from "../persistence/idb";
import { localStorageAdapter } from "../persistence/local-storage";
import { getPreset } from "../policies/presets";

interface PendingWrite {
    body: unknown;
    timerHandle: ReturnType<typeof setTimeout> | null;
    inFlightController: AbortController | null;
    /** Consecutive failed remote writes of this pending body (0 = none). */
    failures: number;
}

/**
 * A failed remote write is NEVER dropped. The record stays pending (so no
 * background refresh can land over the unsaved edit — `isRemoteWritePending`)
 * and the flush re-arms itself: 2s, 4s, 8s, 16s, then every 30s until it lands.
 */
export const REMOTE_WRITE_RETRY_BASE_MS = 2_000;
export const REMOTE_WRITE_RETRY_MAX_MS = 30_000;
/** After this many consecutive failures the person is told, with a Retry now. */
export const REMOTE_WRITE_FAILURES_BEFORE_NOTICE = 3;

export function remoteWriteRetryDelay(failures: number): number {
    return Math.min(
        REMOTE_WRITE_RETRY_BASE_MS * 2 ** Math.max(0, failures - 1),
        REMOTE_WRITE_RETRY_MAX_MS,
    );
}

/** Test seam + production default: tell the person a save keeps failing. */
export interface RemoteWriteFailureNotice {
    /** The failures reached the notice threshold (called once per streak). */
    failing(sliceName: string, message: string, retryNow: () => void): void;
    /** The write finally landed — withdraw the notice. */
    recovered(sliceName: string): void;
}

/** True when the failure is the network being gone, not the server refusing. */
export function isOfflineFailure(message: string): boolean {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    return /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected/i.test(
        message,
    );
}

/**
 * The ONE sentence the person sees — plain, no raw error text (the error itself
 * goes to the log and the Error Inspector). Only says "offline" when it is true.
 */
export function remoteWriteFailureMessage(offline: boolean): string {
    return offline
        ? "Couldn't save your change — you're offline. We'll keep trying."
        : "Couldn't save your change. We'll keep trying.";
}

// ---------------------------------------------------------------------------
// THE UNSAVED MARKER (see the header). Written only when the page is hidden or
// closing — never per keystroke — so it costs one synchronous localStorage
// write per slice at the one moment a tab may die with a save outstanding.
// ---------------------------------------------------------------------------

export const UNSAVED_MARKER_PREFIX = "matrx:unsaved:";

export function unsavedMarkerKey(sliceName: string): string {
    return `${UNSAVED_MARKER_PREFIX}${sliceName}`;
}

/** The marker's envelope body: the unsaved body and the base it diffs from. */
export interface UnsavedMarkerBody {
    body: unknown;
    base: unknown;
}

export function isUnsavedMarkerBody(value: unknown): value is UnsavedMarkerBody {
    return value !== null && typeof value === "object" && "body" in value;
}

/**
 * Remove the slice's marker — only when it is this deploy's (an older one is
 * dead anyway; a NEWER one belongs to a tab already on the next deploy).
 */
function clearUnsavedMarker(policy: Policy<any>): void {
    const key = unsavedMarkerKey(policy.config.sliceName);
    const marker = localStorageAdapter.read(key);
    if (marker && marker.version <= policy.config.version) localStorageAdapter.remove(key);
}

export const REPLAY_UNSAVED_ACTION_TYPE = "sync/replayUnsavedWrite";

/**
 * Engine bookkeeping dispatched by boot after it rehydrated an unsaved marker's
 * body: the middleware hands it to the scheduler (`replayUnsaved`), which puts
 * the marker's base back and queues the write. No reducer handles it.
 */
export interface ReplayUnsavedAction {
    type: typeof REPLAY_UNSAVED_ACTION_TYPE;
    payload: { sliceName: string; body: unknown; base: unknown };
    meta: { fromRehydrate: true };
    [extra: string]: unknown;
}

export function buildReplayUnsavedAction(
    sliceName: string,
    body: unknown,
    base: unknown,
): ReplayUnsavedAction {
    return {
        type: REPLAY_UNSAVED_ACTION_TYPE,
        payload: { sliceName, body, base },
        meta: { fromRehydrate: true },
    };
}

export function isReplayUnsavedAction(action: unknown): action is ReplayUnsavedAction {
    return (
        action !== null &&
        typeof action === "object" &&
        (action as { type?: unknown }).type === REPLAY_UNSAVED_ACTION_TYPE
    );
}

function toastNotice(): RemoteWriteFailureNotice {
    const id = (sliceName: string) => `sync-remote-write-failing:${sliceName}`;
    return {
        failing(sliceName, message, retryNow) {
            toast.error(remoteWriteFailureMessage(isOfflineFailure(message)), {
                id: id(sliceName),
                duration: Infinity,
                action: { label: "Retry now", onClick: retryNow },
            });
        },
        recovered(sliceName) {
            toast.dismiss(id(sliceName));
        },
    };
}

export interface RemoteWriteScheduler {
    /** Record the latest body for this slice; schedule / reschedule the flush. */
    schedule(sliceName: string, body: unknown): void;
    /**
     * A peer tab's broadcast changed the slice. When this tab has a save
     * WAITING on its debounce, it stores the latest body (so the device copy
     * never goes back to the pre-broadcast state). Never aborts an in-flight
     * save and never starts or delays one — the peer saves its own change.
     */
    adoptPeerBody(sliceName: string, body: unknown): void;
    /** Flush every pending write immediately (pagehide). */
    flushAll(): Promise<void>;
    /**
     * The page is hidden or closing: record every outstanding `remote.write`
     * save as an unsaved marker (synchronous), then flush every write still
     * waiting on its debounce or retry backoff now.
     */
    onPageHidden(): void;
    /**
     * Boot found an unsaved marker for this person and showed its body: put
     * its base back and queue the write, so the server receives only what
     * changed. Until it lands no load may land over it
     * (`isUnsavedReplayPending`).
     */
    replayUnsaved(sliceName: string, body: unknown, base: unknown): void;
    /** True while a replayed unsaved write for the slice is still pending. */
    isReplaying(sliceName: string): boolean;
    /** Flush one slice's pending write now; resolves once it is stored (or refused). */
    flushSlice(sliceName: string): Promise<void>;
    /** Cancel in-flight + pending on identity swap — the new identity starts clean. */
    onIdentitySwap(): void;
    /**
     * Record the body the server holds as of a load outcome. A background
     * refresh never lands while a write is pending (`isRemoteWritePending`),
     * and edits held before the first load are rescheduled on top of it
     * (`persistAfterLoad`), so the base only moves under settled state.
     */
    setBase(sliceName: string, body: unknown): void;
    /** True while a write for the slice is scheduled or in flight. */
    hasPending(sliceName: string): boolean;
    /**
     * The `holdUntilHydrated` slices whose writes were refused because
     * hydration had not settled — returned once and forgotten, so the caller
     * saves each slice's live (now merged) state exactly once.
     */
    takeHydrationHolds(): string[];
    /**
     * The bounded wait ran out and the caller merged the saved copy into the
     * slice itself: stop holding this slice for the current identity.
     */
    releaseHold(sliceName: string): void;
    /** Tear down listeners. */
    dispose(): void;
}

export interface CreateRemoteWriteSchedulerOptions {
    policies: readonly Policy<any>[];
    store: Store;
    getIdentity: () => IdentityKey;
    /**
     * Test-only override; production hooks window `pagehide` and document
     * `visibilitychange` (hidden). The handler records unsaved markers and
     * flushes.
     */
    attachPageHide?: (flush: () => void) => () => void;
    /** Test-only default debounce override. Policy-level debounceMs still wins. */
    defaultDebounceMs?: number;
    /** Test-only: how a persistent write failure is told to the person. Default: a toast. */
    failureNotice?: RemoteWriteFailureNotice;
    /**
     * Has the engine finished reading persisted state for the current
     * identity? Gates `holdUntilHydrated` slices. Absent = always settled
     * (a hand-built store with no boot has nothing to wait for).
     */
    hydrationSettled?: () => boolean;
    /**
     * Called when a `holdUntilHydrated` slice has been held for
     * `holdBackstopMs` and the read has still not settled. The caller reads
     * the saved copy, merges it, saves, and calls `releaseHold`. Absent = no
     * bound (a hand-built scheduler with nothing to merge).
     */
    onHoldExpired?: (sliceName: string) => void;
    /** Test-only override of `HOLD_UNTIL_HYDRATED_BACKSTOP_MS`. */
    holdBackstopMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 150;

/**
 * How long a `holdUntilHydrated` slice waits for the read before the engine
 * stops waiting, reads the saved copy itself, and merges. Boot normally
 * settles within a second of the page going idle; past this, waiting longer
 * only risks losing the edit when the tab closes.
 */
export const HOLD_UNTIL_HYDRATED_BACKSTOP_MS = 10_000;

/**
 * Every live scheduler, so the refresh path can ask "does this slice hold
 * unsaved edits?" without a reference to the middleware's closure. A refresh
 * that lands over unsaved edits would repaint them with the server's older
 * values (and move the write's base under it), so the refresh waits.
 */
const liveSchedulers = new Set<RemoteWriteScheduler>();

/** True when any live scheduler holds a pending or in-flight write for the slice. */
export function isRemoteWritePending(sliceName: string): boolean {
    for (const scheduler of liveSchedulers) {
        if (scheduler.hasPending(sliceName)) return true;
    }
    return false;
}

/**
 * True while an unsaved edit a closed page left behind is being saved again
 * here. Unlike an ordinary pending write, this one makes even a COLD-BOOT
 * load wait: the slice already shows the edit, and the server's record is
 * older than it.
 */
export function isUnsavedReplayPending(sliceName: string): boolean {
    for (const scheduler of liveSchedulers) {
        if (scheduler.hasPending(sliceName) && scheduler.isReplaying(sliceName)) return true;
    }
    return false;
}

export function createRemoteWriteScheduler(
    opts: CreateRemoteWriteSchedulerOptions,
): RemoteWriteScheduler {
    const { policies, store, getIdentity } = opts;
    const defaultDebounce = opts.defaultDebounceMs ?? DEFAULT_DEBOUNCE_MS;
    const failureNotice = opts.failureNotice ?? toastNotice();

    // Every warm-cache policy gets a pending entry when it mutates. Policies
    // without `remote.write` still flow through for the IDB-persist leg.
    const bySlice = new Map<string, Policy<any>>(
        policies
            .filter((p) => getPreset(p.config.preset).writeStrategy === "debounced")
            .map((p) => [p.config.sliceName, p] as const),
    );
    const pending = new Map<string, PendingWrite>();
    /** `holdUntilHydrated` slices with a write refused before hydration settled. */
    const heldForHydration = new Set<string>();
    /** Slices whose bounded wait ran out and were merged by the caller. */
    const releasedEarly = new Set<string>();
    const holdTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const holdBackstopMs = opts.holdBackstopMs ?? HOLD_UNTIL_HYDRATED_BACKSTOP_MS;
    const awaitingHydration = (policy: Policy<any>): boolean =>
        policy.config.holdUntilHydrated === true &&
        !releasedEarly.has(policy.config.sliceName) &&
        typeof opts.hydrationSettled === "function" &&
        !opts.hydrationSettled();
    const clearHoldTimers = () => {
        for (const t of holdTimers.values()) clearTimeout(t);
        holdTimers.clear();
    };
    /** The body the server holds, per slice — see `WriteContext.base`. */
    const baseBySlice = new Map<string, unknown>();
    /** Slices whose pending write replays an unsaved marker from a closed page. */
    const replaying = new Set<string>();

    /** `policy.persistWhen` on the live slice; a throwing predicate is "not ready". */
    function persistGateOpen(policy: Policy<any>): boolean {
        const persistWhen = policy.config.persistWhen;
        if (typeof persistWhen !== "function") return true;
        try {
            const live = (store.getState() as Record<string, unknown>)[policy.config.sliceName];
            return persistWhen(live) === true;
        } catch (err) {
            logger.error("persist.gate.threw", {
                sliceName: policy.config.sliceName,
                meta: { error: extractErrorMessage(err) },
            });
            return false;
        }
    }

    async function flushOne(sliceName: string): Promise<void> {
        const record = pending.get(sliceName);
        const policy = bySlice.get(sliceName);
        if (!record || !policy) return;

        // THE HYDRATION GATE (`policy.holdUntilHydrated`). A body built before
        // the persisted read came back holds only what THIS page wrote, so
        // storing it ON THE DEVICE would replace everything saved there with
        // it. The device leg is skipped and the slice remembered: once
        // hydration settles (or the bounded wait runs out) the caller saves
        // the slice's live, merged state. A server save is NOT held — it
        // goes out below on its normal debounce.
        const holdDeviceLeg = awaitingHydration(policy);
        if (holdDeviceLeg && !policy.config.remote?.write) {
            if (record.timerHandle) clearTimeout(record.timerHandle);
            abortByCaller(record.inFlightController, "held until the saved state is read");
            pending.delete(sliceName);
            holdForHydration(sliceName);
            return;
        }

        // THE PERSIST GATE. Every warm-cache write — debounce, pagehide flush,
        // programmatic flush — lands here, so this is the one place a slice
        // that is not ready (its saved record has not loaded) is refused.
        // The body is HELD, never written; the next schedule replaces it.
        if (typeof policy.config.persistWhen === "function") {
            if (!persistGateOpen(policy)) {
                // DROP the body — never keep it for a later flush (a pagehide
                // after the load would write this pre-load body, defaults and
                // all). The slice holds the edits itself and asks for one save
                // when its record loads (`policy.persistAfterLoad`).
                if (record.timerHandle) clearTimeout(record.timerHandle);
                abortByCaller(record.inFlightController, "held until the saved record loads");
                pending.delete(sliceName);
                replaying.delete(sliceName);
                logger.warn("persist.held", {
                    sliceName,
                    meta: {
                        detail: "saved record not loaded — nothing written, so defaults never overwrite it",
                    },
                });
                return;
            }
        }

        // Abort any previous in-flight for this slice so the latest body
        // supersedes.
        abortByCaller(record.inFlightController, "superseded by a newer save");

        const controller = new AbortController();
        record.inFlightController = controller;
        if (record.timerHandle) {
            clearTimeout(record.timerHandle);
            record.timerHandle = null;
        }

        const identity = getIdentity();
        const sliceState = record.body;

        // --- Remote leg FIRST (optional; only if the policy declares remote.write) ---
        // Started synchronously, before the device leg is awaited: on pagehide
        // anything behind an `await` is usually never run, and this request is
        // the one that keeps the edit. The two legs then run side by side.
        const writeFn = policy.config.remote?.write;
        let remoteOutcome: Promise<{ ok: true } | { ok: false; error: unknown }> | null = null;
        if (writeFn) {
            const ctx: WriteContext<unknown> = {
                identity,
                signal: controller.signal,
                body: sliceState,
                base: baseBySlice.get(sliceName),
            };
            logger.debug("remote.write.flush", {
                sliceName,
                meta: { identity: identity.key, bytes: approximateBytes(sliceState) },
            });
            const markLanded = (): { ok: true } => {
                // The server now holds this body's changes: the next write diffs
                // from here. (A failed or aborted write keeps the old base, so its
                // changes are sent again with the next one.)
                if (!controller.signal.aborted) baseBySlice.set(sliceName, sliceState);
                return { ok: true };
            };
            try {
                remoteOutcome = Promise.resolve(writeFn(ctx as WriteContext<never>)).then(
                    markLanded,
                    (error: unknown) => ({ ok: false as const, error }),
                );
            } catch (error) {
                remoteOutcome = Promise.resolve({ ok: false as const, error });
            }
        }

        // --- Storage leg (idb primary, localStorage fallback for warm-cache) ---
        if (holdDeviceLeg) {
            holdForHydration(sliceName);
        } else {
            try {
                await writeSlice(
                    identity.key,
                    sliceName,
                    policy.config.version,
                    sliceState,
                );
                // Mirror into localStorage as the idbFallback tier (private browsing
                // / IDB-disabled path). Small cost, huge resilience win — boot reads
                // this path when idb.open fails.
                localStorageAdapter.write(`matrx:idbFallback:${sliceName}`, {
                    version: policy.config.version,
                    identityKey: identity.key,
                    body: sliceState,
                });
            } catch (err) {
                logger.warn("idb.write.error", {
                    sliceName,
                    meta: { error: extractErrorMessage(err) },
                });
            }
        }

        if (!remoteOutcome) {
            // IDB-only slice: clean up pending entry and return.
            maybeClearPending(sliceName, controller);
            return;
        }

        const outcome = await remoteOutcome;

        if (!outcome.ok && !controller.signal.aborted) {
            // NEVER dropped: keep the record pending and re-arm with backoff.
            retryAfterFailure(sliceName, controller, outcome.error);
            return;
        }
        if (outcome.ok && !controller.signal.aborted && record.failures > 0) {
            logger.info("remote.write.recovered", {
                sliceName,
                meta: { afterFailures: record.failures },
            });
            if (record.failures >= REMOTE_WRITE_FAILURES_BEFORE_NOTICE) {
                failureNotice.recovered(sliceName);
            }
            record.failures = 0;
        }
        maybeClearPending(sliceName, controller);
        // Landed with nothing newer waiting: no edit of this slice is unsaved.
        if (outcome.ok && !controller.signal.aborted && !pending.has(sliceName)) {
            replaying.delete(sliceName);
            clearUnsavedMarker(policy);
        }
    }

    function retryAfterFailure(
        sliceName: string,
        controller: AbortController,
        err: unknown,
    ): void {
        const record = pending.get(sliceName);
        if (!record) return;
        if (record.inFlightController === controller) record.inFlightController = null;
        record.failures += 1;
        const message = extractErrorMessage(err);
        // A newer edit already scheduled its own flush: it carries these
        // changes too (same base), so it is the retry.
        if (record.timerHandle === null) {
            const delay = remoteWriteRetryDelay(record.failures);
            record.timerHandle = setTimeout(() => {
                record.timerHandle = null;
                void flushOne(sliceName);
            }, delay);
            logger.warn("remote.write.error", {
                sliceName,
                meta: { error: message, failures: record.failures, retryInMs: delay },
            });
        } else {
            logger.warn("remote.write.error", {
                sliceName,
                meta: { error: message, failures: record.failures, retry: "next edit's flush" },
            });
        }
        if (record.failures === REMOTE_WRITE_FAILURES_BEFORE_NOTICE) {
            failureNotice.failing(sliceName, message, () => {
                const now = pending.get(sliceName);
                if (!now) return;
                if (now.timerHandle) clearTimeout(now.timerHandle);
                now.timerHandle = null;
                void flushOne(sliceName);
            });
        }
    }

    /**
     * Clean up the pending entry when our flush's controller is still the
     * active one. If `schedule()` fired while we were in-flight, it would
     * have reset `body` + timer; leave that state alone so the next debounce
     * picks it up.
     */
    function maybeClearPending(sliceName: string, controller: AbortController): void {
        const now = pending.get(sliceName);
        if (
            now &&
            now.timerHandle === null &&
            now.inFlightController === controller
        ) {
            pending.delete(sliceName);
        } else if (now && now.inFlightController === controller) {
            now.inFlightController = null;
        }
    }

    function scheduleFlush(sliceName: string, debounceMs: number): void {
        const record = pending.get(sliceName);
        if (!record) return;
        if (record.timerHandle) clearTimeout(record.timerHandle);
        record.timerHandle = setTimeout(() => {
            void flushOne(sliceName);
        }, debounceMs);
    }

    function holdForHydration(sliceName: string): void {
        if (!heldForHydration.has(sliceName)) {
            logger.warn("persist.held", {
                sliceName,
                meta: {
                    detail: "saved state not read yet — nothing written to the device until it is, so this page cannot wipe it",
                },
            });
        }
        heldForHydration.add(sliceName);
        // THE BOUND. A page whose read never settles must not keep the edit
        // off the device forever (it would be lost with the tab).
        if (opts.onHoldExpired && !holdTimers.has(sliceName)) {
            const onExpired = opts.onHoldExpired;
            holdTimers.set(
                sliceName,
                setTimeout(() => {
                    holdTimers.delete(sliceName);
                    const policy = bySlice.get(sliceName);
                    if (!policy || !heldForHydration.has(sliceName) || !awaitingHydration(policy)) return;
                    heldForHydration.delete(sliceName);
                    onExpired(sliceName);
                }, holdBackstopMs),
            );
        }
    }

    function schedule(sliceName: string, body: unknown): void {
        const policy = bySlice.get(sliceName);
        if (!policy) return;
        // A body built before the read came back is never queued for the
        // device: it would still be stale if hydration settled before its
        // debounce ran out. (A slice with a server save is queued — the flush
        // skips only its device leg.)
        if (awaitingHydration(policy) && !policy.config.remote?.write) {
            const stale = pending.get(sliceName);
            if (stale?.timerHandle) clearTimeout(stale.timerHandle);
            abortByCaller(stale?.inFlightController, "held until the saved state is read");
            pending.delete(sliceName);
            holdForHydration(sliceName);
            return;
        }
        const existing = pending.get(sliceName);
        const next: PendingWrite = existing ?? {
            body,
            timerHandle: null,
            inFlightController: null,
            failures: 0,
        };
        next.body = body;
        // If there's an in-flight write, abort it — the new body is newer.
        if (next.inFlightController) {
            abortByCaller(next.inFlightController, "superseded by a newer save");
            next.inFlightController = null;
        }
        pending.set(sliceName, next);
        const debounceMs = policy.config.remote?.debounceMs ?? defaultDebounce;
        logger.debug("remote.write.scheduled", {
            sliceName,
            meta: { debounceMs },
        });
        scheduleFlush(sliceName, debounceMs);
    }

    async function flushAll(): Promise<void> {
        const names = Array.from(pending.keys());
        await Promise.all(names.map((n) => flushOne(n)));
    }

    /**
     * Record every outstanding server save as an unsaved marker. Synchronous
     * (localStorage), so it is on disk even if the page dies right after.
     * A slice whose save the persist gate would refuse is never marked — its
     * body is not a record that may be stored.
     */
    function writeUnsavedMarkers(): void {
        const identity = getIdentity();
        for (const [sliceName, record] of pending) {
            const policy = bySlice.get(sliceName);
            if (!policy?.config.remote?.write) continue;
            if (!persistGateOpen(policy)) continue;
            const body: UnsavedMarkerBody = { body: record.body, base: baseBySlice.get(sliceName) };
            localStorageAdapter.write(unsavedMarkerKey(sliceName), {
                version: policy.config.version,
                identityKey: identity.key,
                body,
            });
        }
    }

    /** Remove markers that are not the incoming identity's: they can never be saved as it. */
    function discardForeignMarkers(): void {
        const current = getIdentity().key;
        for (const policy of bySlice.values()) {
            if (!policy.config.remote?.write) continue;
            const key = unsavedMarkerKey(policy.config.sliceName);
            const marker = localStorageAdapter.read(key);
            if (marker && marker.identityKey !== current && marker.version <= policy.config.version) {
                localStorageAdapter.remove(key);
            }
        }
    }

    function onIdentitySwap(): void {
        const dropped: string[] = [];
        for (const [name, record] of pending) {
            // An unsaved edit of a hold-until-hydrated slice is not lost with
            // the swap: it is saved, merged, once the new identity's read lands.
            const policy = bySlice.get(name);
            const held = policy?.config.holdUntilHydrated === true;
            if (held) holdForHydration(name);
            else dropped.push(name);
            abortByCaller(record.inFlightController, "identity changed");
            if (record.timerHandle) clearTimeout(record.timerHandle);
            // A "we'll keep trying" notice for the person who left would otherwise stay up
            // forever, its Retry doing nothing.
            if (record.failures > 0) failureNotice.recovered(name);
            pending.delete(name);
        }
        if (dropped.length > 0) {
            // The leaving person's unsaved edit cannot be saved as anyone else: say so.
            logger.warn("remote.write.identity-swap.lost", { meta: { slices: dropped } });
        } else {
            logger.info("remote.write.identity-swap.drop", { meta: { dropped: 0 } });
        }
    }

    // --- hidden / pagehide wiring ---
    // A tab that closes usually turns hidden first (mobile always; desktop on
    // tab close and app switch), and `pagehide` may never fire on mobile. Both
    // record the unsaved markers and flush.
    // Only a write still WAITING (debounce or retry backoff) is flushed: an
    // in-flight one is already on the wire, and aborting it to send it again
    // on every tab switch would only risk losing the request during unload.
    function onPageHidden(): void {
        writeUnsavedMarkers();
        const waiting = Array.from(pending)
            .filter(([, record]) => record.timerHandle !== null)
            .map(([name]) => name);
        void Promise.all(waiting.map((name) => flushOne(name)));
    }
    let detachPageHide: (() => void) | null = null;
    if (opts.attachPageHide) {
        detachPageHide = opts.attachPageHide(onPageHidden);
    } else if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        const handler = () => onPageHidden();
        const onVisibility = () => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") onPageHidden();
        };
        window.addEventListener("pagehide", handler);
        if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
        detachPageHide = () => {
            window.removeEventListener("pagehide", handler);
            if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
        };
    }

    const scheduler: RemoteWriteScheduler = {
        schedule,
        adoptPeerBody(sliceName, body) {
            const record = pending.get(sliceName);
            if (record && record.timerHandle !== null) record.body = body;
        },
        flushAll,
        onPageHidden,
        replayUnsaved(sliceName, body, base) {
            if (!bySlice.get(sliceName)?.config.remote?.write) return;
            baseBySlice.set(sliceName, base);
            replaying.add(sliceName);
            schedule(sliceName, body);
        },
        isReplaying: (sliceName) => replaying.has(sliceName),
        flushSlice: (sliceName) => flushOne(sliceName),
        onIdentitySwap() {
            // The new identity's read is a new wait: an early release was for
            // the identity we are leaving.
            releasedEarly.clear();
            clearHoldTimers();
            onIdentitySwap();
            baseBySlice.clear();
            replaying.clear();
            // The leaving person's unsaved marker can never be saved as anyone
            // else. The incoming person's own marker (a page that rendered
            // anonymous first) stays for their resync to replay.
            discardForeignMarkers();
        },
        setBase(sliceName, body) {
            baseBySlice.set(sliceName, body);
        },
        hasPending(sliceName) {
            // Only a REMOTE write makes a refresh wait: an IDB-only slice has
            // nothing a server answer could overwrite.
            return pending.has(sliceName) && !!bySlice.get(sliceName)?.config.remote?.write;
        },
        takeHydrationHolds() {
            const names = Array.from(heldForHydration);
            heldForHydration.clear();
            clearHoldTimers();
            return names;
        },
        releaseHold(sliceName) {
            releasedEarly.add(sliceName);
            heldForHydration.delete(sliceName);
            const t = holdTimers.get(sliceName);
            if (t) clearTimeout(t);
            holdTimers.delete(sliceName);
        },
        dispose() {
            for (const record of pending.values()) {
                abortByCaller(record.inFlightController, "sync engine disposed");
                if (record.timerHandle) clearTimeout(record.timerHandle);
            }
            pending.clear();
            baseBySlice.clear();
            replaying.clear();
            heldForHydration.clear();
            releasedEarly.clear();
            clearHoldTimers();
            liveSchedulers.delete(scheduler);
            detachPageHide?.();
        },
    };
    liveSchedulers.add(scheduler);
    return scheduler;
}

function approximateBytes(body: unknown): number {
    try {
        return JSON.stringify(body).length;
    } catch {
        return -1;
    }
}
