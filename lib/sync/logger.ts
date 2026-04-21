/**
 * lib/sync/logger.ts
 *
 * Single prefixed logger for the sync engine. Silent in production unless
 * `?sync-debug=1` is in the URL or `localStorage.getItem('matrx:sync:debug') === '1'`.
 *
 * Phase 12 expands this into the debug-panel feed + observability hooks (Q8).
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

function emit(level: LogLevel, evt: LogEvent): void {
    if (!isDebugEnabled() && level !== "error") return;
    const line = `[sync] ${evt.event}`;
    const payload: Record<string, unknown> = {};
    if (evt.sliceName) payload.sliceName = evt.sliceName;
    if (evt.ms != null) payload.ms = evt.ms;
    if (evt.meta) Object.assign(payload, evt.meta);
    const hasPayload = Object.keys(payload).length > 0;
    // eslint-disable-next-line no-console
    const fn = console[level] ?? console.log;
    hasPayload ? fn(line, payload) : fn(line);
}

export const logger = {
    debug: (event: string, meta?: Omit<LogEvent, "event">) => emit("debug", { event, ...meta }),
    info: (event: string, meta?: Omit<LogEvent, "event">) => emit("info", { event, ...meta }),
    warn: (event: string, meta?: Omit<LogEvent, "event">) => emit("warn", { event, ...meta }),
    error: (event: string, meta?: Omit<LogEvent, "event">) => emit("error", { event, ...meta }),
};

/** Visible for tests only. */
export const __internal = { DEBUG_FLAG_KEY, DEBUG_URL_PARAM, isDebugEnabled };
