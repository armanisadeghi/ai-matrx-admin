/**
 * Builder panel — the page's own requests, exactly as sent and received.
 *
 * Admin-only: `installRequestLog()` wraps `window.fetch` once (idempotent) so every request any
 * page makes — server API calls, Supabase reads and writes, streams — is kept here with the
 * route it was made from: method, URL, request headers and body, status, response headers and
 * the response body (a stream's text grows as its events arrive). Only secrets are redacted
 * (authorization, api keys, cookies). Nothing is reshaped. Installed by the sidebar Builder item
 * and by `useBuilderFeed` for admins; never loaded for anyone else. FEATURE: ./FEATURE.md.
 */

export interface LoggedRequest {
  seq: number;
  /** The pathname the page was on when the request left. */
  route: string;
  startedAt: number;
  endedAt: number | null;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  status: number | null;
  statusText: string | null;
  responseHeaders: Record<string, string>;
  /** Parsed JSON when the response is JSON, else the text as received. */
  responseBody: unknown;
  /** True while a streamed body is still arriving. */
  streaming: boolean;
  error: string | null;
}

/** The log keeps this many requests (oldest fall off); a body is never cut. */
const MAX_REQUESTS = 600;
const SECRET = /(authorization|api[-_]?key|apikey|cookie|token|secret|password|x-subscription-token)/i;
const SKIP = /\/_next\/|__nextjs|webpack-hmr|\/favicon|\.(png|jpe?g|gif|webp|svg|ico|woff2?|css|js|map)(\?|$)/i;

let installed = false;
let seq = 0;
let entries: LoggedRequest[] = [];
const listeners = new Set<() => void>();
let notifyQueued = false;

function notify() {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    for (const l of listeners) l();
  });
}

export function subscribeRequestLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRequestLog(): LoggedRequest[] {
  return entries;
}

function update(id: number, patch: Partial<LoggedRequest>) {
  entries = entries.map((e) => (e.seq === id ? { ...e, ...patch } : e));
  notify();
}

function headersOf(h: HeadersInit | Headers | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  new Headers(h).forEach((value, key) => {
    out[key] = SECRET.test(key) ? "[redacted]" : value;
  });
  return out;
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url, window.location.href);
    let changed = false;
    u.searchParams.forEach((_v, k) => {
      if (SECRET.test(k)) {
        u.searchParams.set(k, "[redacted]");
        changed = true;
      }
    });
    return changed ? u.toString() : url;
  } catch {
    return url;
  }
}

function parseMaybeJson(text: string): unknown {
  const t = text.trim();
  if (!t || !(t.startsWith("{") || t.startsWith("["))) return text;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return text;
  }
}

function bodyOf(body: BodyInit | null | undefined): unknown {
  if (body === null || body === undefined) return null;
  if (typeof body === "string") return parseMaybeJson(body);
  if (body instanceof URLSearchParams) return body.toString();
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const out: Record<string, string> = {};
    body.forEach((v, k) => {
      out[k] = typeof v === "string" ? v : `[file ${v.name}, ${v.size} bytes]`;
    });
    return out;
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) return `[blob ${body.type || "unknown"}, ${body.size} bytes]`;
  return `[${Object.prototype.toString.call(body).slice(8, -1)}]`;
}

const TEXTUAL = /json|text|event-stream|xml|javascript|ndjson|x-www-form-urlencoded/i;

async function readResponse(id: number, response: Response) {
  const ctype = response.headers.get("content-type") ?? "";
  if (!TEXTUAL.test(ctype) && ctype) {
    const len = response.headers.get("content-length");
    update(id, { responseBody: `[${ctype}${len ? `, ${len} bytes` : ""}]`, streaming: false, endedAt: Date.now() });
    return;
  }
  const reader = response.clone().body?.getReader();
  if (!reader) {
    update(id, { responseBody: null, streaming: false, endedAt: Date.now() });
    return;
  }
  const decoder = new TextDecoder();
  let text = "";
  const streaming = /event-stream|ndjson/i.test(ctype);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (streaming) update(id, { responseBody: text, streaming: true });
    }
    text += decoder.decode();
    update(id, { responseBody: streaming ? text : parseMaybeJson(text), streaming: false, endedAt: Date.now() });
  } catch (error) {
    update(id, {
      responseBody: text,
      streaming: false,
      endedAt: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Wrap `window.fetch` once. Admin-only callers. */
export function installRequestLog(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (SKIP.test(url)) return original(input, init);
    const req = typeof input === "object" && !(input instanceof URL) ? input : null;
    const id = ++seq;
    const entry: LoggedRequest = {
      seq: id,
      route: window.location.pathname,
      startedAt: Date.now(),
      endedAt: null,
      method: (init?.method ?? req?.method ?? "GET").toUpperCase(),
      url: redactUrl(new URL(url, window.location.href).toString()),
      requestHeaders: headersOf(init?.headers ?? req?.headers),
      requestBody: bodyOf(init?.body ?? null),
      status: null,
      statusText: null,
      responseHeaders: {},
      responseBody: null,
      streaming: false,
      error: null,
    };
    entries = [...entries, entry].slice(-MAX_REQUESTS);
    notify();
    try {
      const response = await original(input, init);
      update(id, {
        status: response.status,
        statusText: response.statusText,
        responseHeaders: headersOf(response.headers),
      });
      void readResponse(id, response);
      return response;
    } catch (error) {
      update(id, { error: error instanceof Error ? error.message : String(error), endedAt: Date.now() });
      throw error;
    }
  };
}
