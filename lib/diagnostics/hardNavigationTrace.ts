/**
 * Hard-navigation trace — why did a full page load end a live stream?
 *
 * THE QUESTION THIS ANSWERS (2026-10-12, crawl 8beb27cd): the tab running a
 * site crawl started a full document load at 03:30:02.299Z; the old page's
 * HTTP/3 stream was cancelled when the new page committed at ~03:30:08.4Z, and
 * nothing recorded WHY the page reloaded — a reload button, a typed URL, a
 * link that left the app router, `location.reload()` from our own code, or
 * Next.js falling back to a hard navigation. A full page load kills every
 * live stream on the page (chat included), so the cause has to be on record.
 *
 * HOW. The leaving page writes a small record to `sessionStorage` (which a
 * same-tab navigation keeps): when the leave began (`beforeunload`), when the
 * page was actually torn down (`pagehide`), the page-initiated navigation the
 * Navigation API saw (destination, type, user-initiated or script, and the
 * JS stack of the caller), any reason our own code declared just before it
 * reloaded (`noteHardNavigationReason`), and every NDJSON stream still open
 * (or dropped in the last seconds) with its last-byte time. The NEXT page
 * reads it once at boot and, ONLY when the leave cut a live stream, files one
 * `hard-navigation` capture with the cause — so ordinary navigations cost
 * nothing and never become noise.
 *
 * Cause words: `declared:<reason>` (our code said why), `script-reload` /
 * `script-navigation` (a script with no declared reason — the stack names
 * it; Next.js's own hard-navigation fallback lands here), `link` (a person
 * clicked something that left the app router), `browser-reload` /
 * `browser-navigation` / `back-forward` (browser UI: no page code involved).
 * Only `declared:*` and `script-*` are defects (red). The person's own
 * reload/link/back is worked-as-designed: filed, but at the silent tier
 * (rule `hard-navigation-by-the-person` in errorTierRules.ts).
 */

import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { shortenChunkPaths } from "@/lib/diagnostics/sanitizeErrorContextForAi";

/**
 * Origin + path ONLY. A query or hash can carry a credential (`?code=`, a
 * magic link, a share token), and this record is filed to the server, so
 * neither is ever kept — not in `from`, `to`, the stream labels or the stack.
 */
export function urlWithoutQuery(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/, 1)[0] ?? "";
  }
}

/** A stack with chunk noise shortened and every URL's query/hash removed. */
export function sanitizeNavigationStack(stack: string | undefined): string | null {
  if (!stack) return null;
  return shortenChunkPaths(stack.replace(/(https?:\/\/[^\s?#)]+)[?#][^\s)]*?(?=:\d+:\d+(?:\)|\s|$)|\)|\s|$)/gm, "$1"))
    .split("\n")
    .slice(1, 12)
    .join("\n");
}

const RECORD_KEY = "matrx:hard-navigation:v1";
/** Kept in sync with ChunkRecoveryBootScript's KEY (its one allowed copy). */
const CHUNK_RELOAD_KEY = "chunk-load-recovery:last-reload";
/** A leave record older than this at the next boot belongs to something else. */
const RECORD_MAX_AGE_MS = 120_000;
/** A stream that dropped this recently still counts as cut by the leave. */
const RECENT_DROP_MS = 15_000;
/** A declared reason / navigate event this old is not the cause of this leave. */
const CAUSE_WINDOW_MS = 30_000;

interface LiveStream {
  label: string;
  openedAt: number;
  lastByteAt: number;
  closedAt: number | null;
  closeReason: "ended" | "transport_lost" | "aborted" | null;
}

interface PageNavigation {
  at: number;
  to: string;
  navigationType: string;
  userInitiated: boolean;
  stack: string | null;
}

interface LeaveRecord {
  v: 1;
  from: string;
  beforeunloadAt: number | null;
  pagehideAt: number | null;
  navigation: PageNavigation | null;
  declared: { at: number; reason: string } | null;
  streams: Array<Omit<LiveStream, "closedAt"> & { closedAt: number | null }>;
}

const streams = new Map<number, LiveStream>();
let nextStreamId = 1;
let lastNavigation: PageNavigation | null = null;
let declared: { at: number; reason: string } | null = null;
let beforeunloadAt: number | null = null;
let installed = false;

/** Our own code is about to reload or hard-navigate: say why, first. */
export function noteHardNavigationReason(reason: string): void {
  declared = { at: Date.now(), reason };
}

/**
 * Register one live NDJSON stream (the ONE app parser calls this). `touch` on
 * every event; `close` once with how it ended.
 */
export function trackLiveStream(label: string): {
  touch: () => void;
  close: (reason: "ended" | "transport_lost" | "aborted") => void;
} {
  const id = nextStreamId++;
  const now = Date.now();
  streams.set(id, {
    label: urlWithoutQuery(label),
    openedAt: now,
    lastByteAt: now,
    closedAt: null,
    closeReason: null,
  });
  return {
    touch: () => {
      const entry = streams.get(id);
      if (entry) entry.lastByteAt = Date.now();
    },
    close: (reason) => {
      const entry = streams.get(id);
      if (!entry || entry.closedAt !== null) return;
      if (reason === "ended") {
        streams.delete(id);
        return;
      }
      entry.closedAt = Date.now();
      entry.closeReason = reason;
      setTimeout(() => streams.delete(id), RECENT_DROP_MS);
    },
  };
}

function streamSnapshot(now: number): LeaveRecord["streams"] {
  return [...streams.values()]
    .filter((entry) => entry.closedAt === null || now - entry.closedAt <= RECENT_DROP_MS)
    .map((entry) => ({ ...entry }));
}

function currentPath(): string {
  return urlWithoutQuery(window.location.href);
}

function writeRecord(phase: "beforeunload" | "pagehide"): void {
  try {
    const now = Date.now();
    const snapshot = streamSnapshot(now);
    const previous = readRecord();
    // Keep the earliest view of the streams: by pagehide the browser may
    // already have cancelled them.
    const sameLeave =
      phase === "pagehide" &&
      previous !== null &&
      beforeunloadAt !== null &&
      previous.beforeunloadAt === beforeunloadAt;
    const keptStreams =
      sameLeave && previous.streams.length > 0 ? previous.streams : snapshot;
    if (keptStreams.length === 0) {
      window.sessionStorage.removeItem(RECORD_KEY);
      return;
    }
    const record: LeaveRecord = {
      v: 1,
      from: currentPath(),
      beforeunloadAt,
      pagehideAt: phase === "pagehide" ? now : null,
      navigation:
        lastNavigation && now - lastNavigation.at <= CAUSE_WINDOW_MS ? lastNavigation : null,
      declared: declared && now - declared.at <= CAUSE_WINDOW_MS ? declared : null,
      streams: keptStreams,
    };
    window.sessionStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    /* storage blocked — the trace is best-effort, never a page breaker */
  }
}

function readRecord(): LeaveRecord | null {
  try {
    const text = window.sessionStorage.getItem(RECORD_KEY);
    if (!text) return null;
    const parsed = JSON.parse(text) as Partial<LeaveRecord>;
    return parsed?.v === 1 && Array.isArray(parsed.streams) ? (parsed as LeaveRecord) : null;
  } catch {
    return null;
  }
}

function newPageNavigationType(): string {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return entry?.type ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Pure: the cause word for one leave (exported for its test). */
export function hardNavigationCause(
  record: Pick<LeaveRecord, "navigation" | "declared">,
  newPageType: string,
): string {
  if (record.declared) return `declared:${record.declared.reason}`;
  if (record.navigation) {
    if (record.navigation.userInitiated) return "link";
    return record.navigation.navigationType === "reload"
      ? "script-reload"
      : "script-navigation";
  }
  if (newPageType === "reload") return "browser-reload";
  if (newPageType === "back_forward") return "back-forward";
  return "browser-navigation";
}

function reportPreviousLeave(): void {
  try {
    fileLeaveRecord();
  } catch {
    /* the trace must never cost the page its other global listeners */
  }
}

function fileLeaveRecord(): void {
  const record = readRecord();
  try {
    window.sessionStorage.removeItem(RECORD_KEY);
  } catch {
    /* ignore */
  }
  if (!record || record.streams.length === 0) return;
  const pageStart = performance.timeOrigin;
  const leftAt = record.beforeunloadAt ?? record.pagehideAt ?? 0;
  if (!leftAt || Math.abs(pageStart - leftAt) > RECORD_MAX_AGE_MS) return;
  const newPageType = newPageNavigationType();
  const cause = hardNavigationCause(record, newPageType);
  let chunkReloadAt: number | null = null;
  try {
    const value = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    chunkReloadAt = value || null;
  } catch {
    /* ignore */
  }
  const lines = [
    `cause: ${cause}`,
    `from: ${record.from}`,
    `to: ${currentPath()} (new page navigation type: ${newPageType})`,
    `leave began: ${record.beforeunloadAt ? new Date(record.beforeunloadAt).toISOString() : "no beforeunload"}`,
    `page torn down: ${record.pagehideAt ? new Date(record.pagehideAt).toISOString() : "no pagehide recorded"}`,
    `new page started: ${new Date(pageStart).toISOString()}`,
    ...record.streams.map(
      (stream) =>
        `stream ${stream.label}: open ${Math.round((leftAt - stream.openedAt) / 1000)}s, last byte ${Math.round((leftAt - stream.lastByteAt) / 1000)}s before the leave${stream.closeReason ? `, ${stream.closeReason}` : ""}`,
    ),
    ...(record.navigation?.stack ? [`navigation stack:\n${record.navigation.stack}`] : []),
  ];
  captureError({
    source: "hard-navigation",
    code: cause,
    message: `A full page load (${cause}) ended ${record.streams.length} live stream${record.streams.length === 1 ? "" : "s"}.`,
    details: lines.join("\n"),
    raw: { record, newPageType, pageStart, chunkReloadAt },
  });
}

interface NavigateEventLike extends Event {
  navigationType: string;
  userInitiated: boolean;
  destination: { url: string; sameDocument: boolean };
}

/** Install once per page, as early as the boot bundle runs. Browser-only. */
export function installHardNavigationTrace(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  reportPreviousLeave();
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  navigation?.addEventListener("navigate", (event) => {
    const navigate = event as NavigateEventLike;
    if (navigate.destination?.sameDocument) return;
    lastNavigation = {
      at: Date.now(),
      to: urlWithoutQuery(navigate.destination?.url ?? ""),
      navigationType: navigate.navigationType,
      userInitiated: Boolean(navigate.userInitiated),
      stack: sanitizeNavigationStack(new Error("hard navigation").stack),
    };
  });
  window.addEventListener("beforeunload", () => {
    beforeunloadAt = Date.now();
    writeRecord("beforeunload");
  });
  window.addEventListener("pagehide", (event) => {
    if ((event as PageTransitionEvent).persisted) return;
    writeRecord("pagehide");
  });
  window.addEventListener("pageshow", () => {
    // A cancelled leave or a back/forward-cache restore: this page lives on.
    try {
      window.sessionStorage.removeItem(RECORD_KEY);
    } catch {
      /* ignore */
    }
    beforeunloadAt = null;
    lastNavigation = null;
    declared = null;
  });
}
