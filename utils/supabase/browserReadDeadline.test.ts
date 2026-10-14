/**
 * @jest-environment node
 */
/**
 * THE BROWSER READ DEADLINE on a REAL supabase-js client (postgrest-js's own
 * retry loop included): a read whose headers never arrive fails ONCE as a
 * named TimeoutError inside the deadline; a slow-but-alive response, a slow
 * body, a write/RPC and a caller's own abort are all left alone.
 */
import { createClient } from "@supabase/supabase-js";
import {
  BROWSER_READ_HEADER_DEADLINE_MS,
  hasBrowserReadDeadline,
  installBrowserReadDeadline,
  isBrowserReadDeadlineError,
} from "./browserReadDeadline";

const DEADLINE = 200;

type Handler = (url: string, init: RequestInit | undefined) => Promise<Response>;

function clientWith(handler: Handler) {
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

  it("is idempotent and detectable on the client", () => {
    const { client } = clientWith(neverAnswers);
    const wrapped = (client as unknown as { rest: { fetch: unknown } }).rest.fetch;
    installBrowserReadDeadline(client, DEADLINE);
    expect((client as unknown as { rest: { fetch: unknown } }).rest.fetch).toBe(wrapped);
    expect(hasBrowserReadDeadline(client)).toBe(true);
  });
});
