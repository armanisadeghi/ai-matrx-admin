/**
 * lib/sync/logger.ts
 *
 * Single prefixed logger for the sync engine. Silent in production unless
 * `?sync-debug=1` is in the URL or `localStorage.getItem('matrx:sync:debug') === '1'`.
 *
 * Phase 12 expands this into the debug-panel feed + observability hooks (Q8).
 *
 * NOTHING FAILS SILENTLY (2026-10-14): every `warn` and `error` also goes to the failure sink —
 * the Error Inspector, registered by `installGlobalErrorCapture` (lib/diagnostics). Before this a
 * production warn (a full or disabled localStorage, a corrupt record, an IndexedDB write that
 * failed) printed nothing and reached no one. The sink is registered from outside so this file
 * stays dependency-free (it loads at boot, before the diagnostics store); events raised before
 * registration are held (bounded) and handed over when it arrives.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEvent {
    event: string;
    sliceName?: string;
    ms?: number;
    meta?: Record<string, unknown>;
}

const DEBUG_FLAG_KEY = "matrx:sync:debug";
const DEBUG_URL_PARAM = "sync-debug";

function isDebugEnabled(): boolean {
    if (process.env.NODE_ENV !== "production") return true;
    if (typeof window === "undefined") return false;
    try {
        if (window.localStorage?.getItem(DEBUG_FLAG_KEY) === "1") return true;
        const params = new URLSearchParams(window.location.search);
        return params.get(DEBUG_URL_PARAM) === "1";
    } catch {
        return false;
    }
}

/** A warn/error the sink receives. `dataLoss` marks a write that did not land and is not retried. */
export interface SyncFailure {
    level: "warn" | "error";
    event: string;
    sliceName?: string;
    meta?: Record<string, unknown>;
    dataLoss: boolean;
}

export type SyncFailureSink = (failure: SyncFailure) => void;

/** Writes that are dropped, not retried: the state they carried is not saved. */
const DATA_LOSS_EVENTS = new Set(["persist.write.failed", "idb.write.error", "persist.serialize.failed"]);
const MAX_PENDING = 50;
let sink: SyncFailureSink | null = null;
let pending: SyncFailure[] = [];

/** Register where warn/error events go (the Error Inspector). Flushes events held before now. */
export function setSyncFailureSink(next: SyncFailureSink | null): void {
    sink = next;
    if (!next) return;
    const held = pending;
    pending = [];
    for (const f of held) deliver(f);
}

function deliver(failure: SyncFailure): void {
    if (!sink) {
        if (pending.length < MAX_PENDING) pending.push(failure);
        return;
    }
    try {
        sink(failure);
    } catch {
        /* the sink must never break the engine */
    }
}

/** The sink owner's console echo for errors (it marks the echo so the console net skips the copy). */
let consoleWriter: ((...args: unknown[]) => void) | null = null;
export function setSyncConsoleErrorWriter(writer: ((...args: unknown[]) => void) | null): void {
    consoleWriter = writer;
}

function emit(level: LogLevel, evt: LogEvent): void {
    if (level === "warn" || level === "error") {
        deliver({
            level,
            event: evt.event,
            sliceName: evt.sliceName,
            meta: evt.meta,
            dataLoss: DATA_LOSS_EVENTS.has(evt.event),
        });
    }
    if (!isDebugEnabled() && level !== "error") return;
    const line = `[sync] ${evt.event}`;
    const payload: Record<string, unknown> = {};
    if (evt.sliceName) payload.sliceName = evt.sliceName;
    if (evt.ms != null) payload.ms = evt.ms;
    if (evt.meta) Object.assign(payload, evt.meta);
    const hasPayload = Object.keys(payload).length > 0;
    // eslint-disable-next-line no-console
    const fn = level === "error" && consoleWriter ? consoleWriter : (console[level] ?? console.log);
    hasPayload ? fn(line, payload) : fn(line);
}

export const logger = {
    debug: (event: string, meta?: Omit<LogEvent, "event">) => emit("debug", { event, ...meta }),
    info: (event: string, meta?: Omit<LogEvent, "event">) => emit("info", { event, ...meta }),
    warn: (event: string, meta?: Omit<LogEvent, "event">) => emit("warn", { event, ...meta }),
    error: (event: string, meta?: Omit<LogEvent, "event">) => emit("error", { event, ...meta }),
};

/** Visible for tests only. */
export const __internal = {
    DEBUG_FLAG_KEY,
    DEBUG_URL_PARAM,
    isDebugEnabled,
    DATA_LOSS_EVENTS,
    resetSink: () => {
        sink = null;
        pending = [];
        consoleWriter = null;
    },
};
