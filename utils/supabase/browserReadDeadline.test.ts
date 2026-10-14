/**
 * @jest-environment node
 */
/**
 * THE BROWSER READ DEADLINE on a REAL supabase-js client (postgrest-js's own
 * retry loop included): a read whose headers never arrive fails ONCE as a
 * named TimeoutError inside the deadline; a slow-but-alive response, a slow
 * body, a write/RPC and a caller's own abort are all left alone.
 */
import { getEventListeners } from "node:events";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  BROWSER_READ_HEADER_DEADLINE_MS,
  LONG_RUNNING_FUNCTIONS,
  hasBrowserReadDeadline,
  installBrowserReadDeadline,
  isBrowserReadDeadlineError,
} from "./browserReadDeadline";

const DEADLINE = 200;

type Handler = (url: string, init: RequestInit | undefined) => Promise<Response>;

function clientWith(handler: Handler, accessToken?: () => Promise<string | null>) {
  const restCalls: Array<{ url: string; method: string }> = [];
  const fetchStub = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/rest/v1/")) {
      restCalls.push({ url, method: (init?.method ?? "GET").toUpperCase() });
    }
    return handler(url, init);
  };
  const client = createClient("http://deadline.test", "sb_publishable_test", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchStub as typeof fetch },
    ...(accessToken ? { accessToken } : {}),
  });
  installBrowserReadDeadline(client, DEADLINE);
  return { client, restCalls };
}

/** A socket that never sends headers: settles only when its signal aborts. */
const neverAnswers: Handler = (_url, init) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
      once: true,
    });
  });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const after = <T>(ms: number, value: () => T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value()), ms));

describe("browser read deadline", () => {
  it("is a 12s constant: 8s authenticated statement_timeout + 4s transport", () => {
    expect(BROWSER_READ_HEADER_DEADLINE_MS).toBe(12_000);
  });

  it("fails a stalled GET once, as a TimeoutError, inside the deadline — no 4x retry", async () => {
    const { client, restCalls } = clientWith(neverAnswers);
    const started = Date.now();
    const { data, error, status } = await client.from("things").select("*");
    const elapsed = Date.now() - started;

    expect(data).toBeNull();
    expect(status).toBe(0);
    expect(error?.message).toMatch(/^TimeoutError: database sent no response headers within 200ms/);
    expect(isBrowserReadDeadlineError(error)).toBe(true);
    // postgrest-js would otherwise wait 1s+2s+4s between three more attempts.
    expect(restCalls).toHaveLength(1);
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE - 5);
    expect(elapsed).toBeLessThan(DEADLINE + 800);
  });

  it("covers .schema().from() and GET rpc reads too", async () => {
    const { client, restCalls } = clientWith(neverAnswers);
    const scoped = await client.schema("iam").from("x").select("id");
    const rpcGet = await client.rpc("f", {}, { get: true });
    expect(scoped.error?.message).toMatch(/^TimeoutError/);
    expect(rpcGet.error?.message).toMatch(/^TimeoutError/);
    expect(restCalls).toHaveLength(2);
  });

  it("lets a slow-but-alive response through when headers beat the deadline", async () => {
    const { client } = clientWith(() => after(DEADLINE / 2, () => json([{ id: 1 }])));
    const { data, error } = await client.from("things").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }]);
  });

  it("never cuts a body that keeps streaming long past the deadline", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const parts = ['[{"id":1}', ',{"id":2}', ',{"id":3}]'];
        for (const part of parts) {
          await after(DEADLINE, () => undefined); // 3 x deadline of streaming
          controller.enqueue(encoder.encode(part));
        }
        controller.close();
      },
    });
    const { client } = clientWith(async () =>
      new Response(body, { status: 200, headers: { "content-type": "application/json" } }),
    );
    const started = Date.now();
    const { data, error } = await client.from("big_export").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(Date.now() - started).toBeGreaterThan(DEADLINE * 2);
  });

  it("leaves writes and POST RPCs unbounded (long RPCs run 20s–10min)", async () => {
    const { client, restCalls } = clientWith((_url, init) =>
      after(DEADLINE * 3, () => (init?.method === "POST" ? json({ ok: true }) : json([]))),
    );
    const rpc = await client.rpc("template_install", { p: 1 });
    expect(rpc.error).toBeNull();
    expect(rpc.data).toEqual({ ok: true });
    expect(restCalls.map((c) => c.method)).toEqual(["POST"]);
  });

  it("keeps a caller's own abort an AbortError, not a TimeoutError", async () => {
    const { client } = clientWith(neverAnswers);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), DEADLINE / 4);
    const { error } = await client.from("things").select("*").abortSignal(controller.signal);
    expect(error?.message).toMatch(/^AbortError/);
    expect(isBrowserReadDeadlineError(error)).toBe(false);
  });

  it("starts the clock at the wire: a slow access-token wait is never blamed on the database", async () => {
    const slowToken = () => after(DEADLINE * 3, () => "token");
    const { client } = clientWith(() => after(DEADLINE / 4, () => json([{ id: 1 }])), slowToken);
    const { data, error } = await client.from("things").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }]);
  });

  it("still fails a stalled wire after a slow token, one deadline after the send", async () => {
    const slowToken = () => after(DEADLINE * 2, () => "token");
    const { client, restCalls } = clientWith(neverAnswers, slowToken);
    const started = Date.now();
    const { error } = await client.from("things").select("*");
    const elapsed = Date.now() - started;
    expect(isBrowserReadDeadlineError(error)).toBe(true);
    expect(restCalls).toHaveLength(1);
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE * 3 - 10);
  });

  it("leaves no listener on a long-lived caller signal after reads finish", async () => {
    const { client } = clientWith(async () => json([]));
    const shared = new AbortController();
    for (let i = 0; i < 20; i++) {
      const { error } = await client.from("things").select("*").abortSignal(shared.signal);
      expect(error).toBeNull();
    }
    expect(getEventListeners(shared.signal, "abort")).toHaveLength(0);
  });

  it("is idempotent and detectable on the client", () => {
    const { client } = clientWith(neverAnswers);
    const wrapped = (client as unknown as { rest: { fetch: unknown } }).rest.fetch;
    installBrowserReadDeadline(client, DEADLINE);
    expect((client as unknown as { rest: { fetch: unknown } }).rest.fetch).toBe(wrapped);
    expect(hasBrowserReadDeadline(client)).toBe(true);
  });
});

/**
 * THE LONG-FUNCTION GUARD. The deadline bounds GET/HEAD only; every function
 * in LONG_RUNNING_FUNCTIONS runs past it by design and is called with POST
 * today (zero `.rpc(…, { get|head: true })` calls exist, 2026-10-14). A GET or
 * HEAD call to one would be cut at 12s mid-work, so this fails on it.
 */
const SCAN_ROOTS = ["app", "features", "lib", "utils", "components", "hooks", "providers"];
const SHARED_PACKAGES = join(__dirname, "../../../aidream/apps/shared");

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Every `.rpc(...)` call whose arguments ask for GET/HEAD, with its literal name (or null). */
export function readRpcCalls(source: string): Array<{ fn: string | null; index: number }> {
  const found: Array<{ fn: string | null; index: number }> = [];
  const re = /\.rpc\s*(<[^(]*>)?\s*\(/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
    }
    const args = source.slice(m.index + m[0].length, i - 1);
    if (!/\b(get|head)\s*:\s*true\b/.test(args)) continue;
    const name = /^\s*["'`]([\w.]+)["'`]/.exec(args);
    found.push({ fn: name ? name[1] : null, index: m.index });
  }
  return found;
}

function isLongRunning(fn: string, schemaHint: string | null): boolean {
  return LONG_RUNNING_FUNCTIONS.some((q) => {
    const [schema, name] = q.split(".");
    return fn === name && (schemaHint === null || schemaHint === schema);
  });
}

describe("long-running functions are never read with GET/HEAD", () => {
  it("self-test: flags a planted GET/HEAD call to a long function and an unnamed one", () => {
    const planted = `
      await supabase.schema("custom").rpc("template_install", { p_id: id }, { get: true });
      await supabase.rpc(fnName, {}, { head: true });
      await supabase.rpc("template_install", { p_id: id });
    `;
    const calls = readRpcCalls(planted);
    expect(calls.map((c) => c.fn)).toEqual(["template_install", null]);
    expect(isLongRunning("template_install", null)).toBe(true);
  });

  it("finds no GET/HEAD rpc call naming a long function (or a name it cannot read) in the app or shared packages", () => {
    const roots = [
      ...SCAN_ROOTS.map((r) => join(__dirname, "../..", r)),
      ...(existsSync(SHARED_PACKAGES)
        ? readdirSync(SHARED_PACKAGES).map((p) => join(SHARED_PACKAGES, p, "src"))
        : []),
    ];
    const offenders: string[] = [];
    for (const file of roots.flatMap((r) => sourceFiles(r))) {
      const text = readFileSync(file, "utf8");
      if (!text.includes(".rpc")) continue;
      for (const call of readRpcCalls(text)) {
        if (call.fn === null || isLongRunning(call.fn, null)) {
          offenders.push(`${file}:${text.slice(0, call.index).split("\n").length} ${call.fn ?? "<dynamic name>"}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
