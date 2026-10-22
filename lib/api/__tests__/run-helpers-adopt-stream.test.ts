/**
 * THE RUN HELPERS ADOPT THEIR STREAM WITHOUT CHANGING WHAT THEIR CALLERS SEE.
 *
 * `callAgentStart`, `callConversationContinue` and `callConversationForkAndRun`
 * (lib/api/run-helpers.ts) hand their NDJSON body to `adoptForeignStream`, so the
 * run lands in `activeRequests` and Watch AI can watch it. Their callers (reply
 * composer, debrief, assignment demo) still read the stream through
 * `onStreamEvent`, so this proves, over a REAL captured server stream:
 *   * every event reaches `onStreamEvent` exactly once, in wire order — the same
 *     sequence callApi's own reader delivers for the same bytes;
 *   * the returned result is identical to the un-adopted call's;
 *   * the run IS adopted (an activeRequests row under the server's request id);
 *   * an HTTP failure, a dropped socket and a caller cancel end as before.
 * Stand-ins: `fetch` (it returns the captured bytes, never a live call), the
 * organization ladder, the run-wait knob read, the usage gate (network reads) and
 * the chat host's database (a fake; nothing here reads it).
 */
import "@/__tests__/helpers/register-chat-host";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { configureStore } from "@reduxjs/toolkit";
import { createSlimRootReducer } from "@/lib/redux/rootReducer";
import { setAuthReady, setAccessToken } from "@/lib/redux/slices/userAuthSlice";
import { setOrganization } from "@/lib/redux/slices/appContextSlice";
import { callApi, type ApiCallResult } from "@/lib/api/call-api";
import {
  callAgentStart,
  callConversationContinue,
  callConversationForkAndRun,
} from "@/lib/api/run-helpers";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";
import { configureChat, _resetChatHostForTests } from "@ai-matrx/chat/host";
import { createFakeDb } from "@ai-matrx/chat/testing/fake-db";

const ORGANIZATION_ID = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";
const REQUEST_ID = "438921dc-c214-4411-98c8-87bdd041f5dc";

jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: async () => "5dc930e9-bd65-44a1-8369-af773f6e1a5b",
}));
jest.mock("@/lib/api/run-wait", () => ({
  ...jest.requireActual("@/lib/api/run-wait"),
  resolveRunWait: async () => ({ firstResponseMs: 5_000 }),
}));
jest.mock("@/features/entitlements/usage-gate/paidAiPaths", () => ({
  isPaidAiCall: () => false,
}));

const globals = globalThis as { TextEncoder?: typeof NodeTextEncoder; TextDecoder?: typeof NodeTextDecoder };
if (!globals.TextEncoder) globals.TextEncoder = NodeTextEncoder;
if (!globals.TextDecoder) globals.TextDecoder = NodeTextDecoder;

/** The live `applets.build` agent stream, captured 2026-10-07 (551 events, ends with `end`). */
const RAW = readFileSync(
  join(__dirname, "../../../features/content-ir/__tests__/fixtures/applet-build-stream.ndjson"),
  "utf8",
);
const LINES = RAW.split("\n").filter((line) => line.trim());
const CONVERSATION_ID = JSON.parse(LINES.find((l) => l.includes('"conversation_id"'))!).data
  .conversation_id as string;

/** The captured bytes as a fetch body, cut at odd offsets so lines straddle reads. */
function streamResponse(text: string, options: { status?: number; json?: unknown } = {}): Response {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += 977) chunks.push(bytes.slice(i, i + 977));
  let index = 0;
  const status = options.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    url: "https://server.test/ai/agents/agent-test",
    headers: new Headers({ "X-Request-ID": REQUEST_ID, "X-Conversation-ID": CONVERSATION_ID }),
    json: async () => options.json,
    body: {
      getReader: () => ({
        read: async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          return index >= chunks.length
            ? { done: true, value: undefined }
            : { done: false, value: chunks[index++] };
        },
        releaseLock: () => {},
        cancel: async () => {},
      }),
    },
  } as unknown as Response;
}

function makeStore() {
  const store = configureStore({
    reducer: createSlimRootReducer(),
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(setAuthReady(true));
  store.dispatch(setAccessToken("test-token"));
  store.dispatch(setOrganization({ id: ORGANIZATION_ID, name: "Test" } as never));
  return store;
}

const TEST_OVERRIDES = { forceBaseUrl: "https://server.test" };

/**
 * `fetch` answers the AI door with `response` and every other URL (the kind
 * catalog the canonical pipeline reads) with an empty 503 — never the network.
 */
function routeFetch(response: Response): jest.Mock {
  const mock = jest.fn(async (url: unknown) =>
    String(url).startsWith("https://server.test/")
      ? response
      : ({ ok: false, status: 503, headers: new Headers(), json: async () => ({}), text: async () => "" } as unknown as Response),
  );
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}
function serverCalls(mock: jest.Mock): string[] {
  return mock.mock.calls.map((c) => String(c[0])).filter((u) => u.startsWith("https://server.test/"));
}
const originalFetch = global.fetch;
beforeAll(() => {
  configureChat({ db: createFakeDb().db });
});
afterAll(() => {
  _resetChatHostForTests();
});
afterEach(() => {
  global.fetch = originalFetch;
});

type Recorder = {
  events: TypedStreamEvent[];
  starts: number;
  completes: number;
  errors: unknown[];
};
function recorder(): Recorder {
  return { events: [], starts: 0, completes: 0, errors: [] };
}

/** The same bytes through callApi's OWN reader — the behavior before adoption. */
async function baseline(text = RAW): Promise<{ rec: Recorder; result: ApiCallResult }> {
  routeFetch(streamResponse(text));
  const store = makeStore();
  const rec = recorder();
  const result = await store.dispatch(
    callApi({
      path: "/ai/agents/{agent_id}",
      method: "POST",
      pathParams: { agent_id: "agent-test" },
      body: { user_input: "hi", conversation_id: CONVERSATION_ID, is_new: true, store: true },
      stream: true,
      onStreamEvent: (e) => rec.events.push(e),
      onStreamComplete: () => rec.completes++,
      onStreamError: (e) => rec.errors.push(e),
      _testOverrides: TEST_OVERRIDES,
    }),
  );
  return { rec, result };
}

const DOORS = {
  callAgentStart: (rec: Recorder, signal?: AbortSignal) =>
    callAgentStart({
      agentId: "agent-test",
      body: { user_input: "hi", conversation_id: CONVERSATION_ID, is_new: true, store: true },
      signal,
      onStreamEvent: (e) => rec.events.push(e),
      onStreamComplete: () => rec.completes++,
      onStreamError: (e) => rec.errors.push(e),
      _testOverrides: TEST_OVERRIDES,
    }),
  callConversationContinue: (rec: Recorder, signal?: AbortSignal) =>
    callConversationContinue({
      conversationId: CONVERSATION_ID,
      body: { user_input: "hi" },
      signal,
      onStreamEvent: (e) => rec.events.push(e),
      onStreamComplete: () => rec.completes++,
      onStreamError: (e) => rec.errors.push(e),
      _testOverrides: TEST_OVERRIDES,
    }),
  callConversationForkAndRun: (rec: Recorder, signal?: AbortSignal) =>
    callConversationForkAndRun({
      conversationId: CONVERSATION_ID,
      body: {} as never,
      signal,
      onStreamStart: () => rec.starts++,
      onStreamEvent: (e) => rec.events.push(e),
      onStreamComplete: () => rec.completes++,
      onStreamError: (e) => rec.errors.push(e),
      _testOverrides: TEST_OVERRIDES,
    }),
} as const;

describe.each(Object.keys(DOORS) as (keyof typeof DOORS)[])("%s adopts its stream", (name) => {
  const door = DOORS[name];

  it("delivers every captured event once, in order, and returns the same result", async () => {
    const before = await baseline();
    expect(before.rec.events).toHaveLength(LINES.length);

    const fetchMock = routeFetch(streamResponse(RAW));
    const store = makeStore();
    const rec = recorder();
    const result = await store.dispatch(door(rec));

    expect(serverCalls(fetchMock)).toHaveLength(1);
    expect(rec.events).toHaveLength(LINES.length);
    expect(rec.events).toEqual(before.rec.events);
    // Once each, in wire order: the wire's own sequence numbers, 1..551, one per event
    // (compact `{"e":"c","t":…}` chunk frames expand to `chunk` events in both readers).
    const wireSeq = LINES.map((line) => (JSON.parse(line) as { stream_seq: number }).stream_seq);
    expect(rec.events.map((e) => (e as { stream_seq?: number }).stream_seq)).toEqual(wireSeq);
    expect(new Set(wireSeq).size).toBe(LINES.length);
    expect(result).toEqual(before.result);
    expect(result).toEqual({ requestId: REQUEST_ID, conversationId: CONVERSATION_ID });
    expect(rec.completes).toBe(1);
    expect(rec.errors).toEqual([]);
    if (name === "callConversationForkAndRun") expect(rec.starts).toBe(1);
    // Adopted: the run is a row Watch AI reads, under the server's request id.
    expect(store.getState().activeRequests.byRequestId[REQUEST_ID]?.status).toBe("complete");
  });

  it("returns the server's refusal and calls onStreamError once", async () => {
    routeFetch(streamResponse("", { status: 500, json: { message: "Server refused." } }));
    const rec = recorder();
    const result = await makeStore().dispatch(door(rec));
    expect(result.error).toMatchObject({ status: 500, message: "Server refused." });
    expect(rec.errors).toHaveLength(1);
    expect(rec.events).toEqual([]);
    expect(rec.completes).toBe(0);
  });

  it("ends a socket cut before the terminal event exactly as callApi's own reader does", async () => {
    const cut = LINES.slice(0, 40).join("\n") + "\n";
    const before = await baseline(cut);
    routeFetch(streamResponse(cut));
    const rec = recorder();
    const result = await makeStore().dispatch(door(rec));
    expect(rec.events).toHaveLength(40);
    expect(rec.events).toEqual(before.rec.events);
    expect(result).toEqual(before.result);
    expect(rec.errors).toHaveLength(before.rec.errors.length);
    expect(rec.completes).toBe(before.rec.completes);
  });

  it("ends quietly when the caller cancels, as callApi's own reader does", async () => {
    const controller = new AbortController();
    const bytes = new TextEncoder().encode(RAW);
    let reads = 0;
    const response = streamResponse(RAW);
    (response as unknown as { body: unknown }).body = {
      getReader: () => ({
        read: async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (controller.signal.aborted) {
            const abort = new Error("The operation was aborted.");
            abort.name = "AbortError";
            throw abort;
          }
          reads += 1;
          if (reads === 3) controller.abort();
          const start = (reads - 1) * 977;
          return { done: false, value: bytes.slice(start, start + 977) };
        },
        releaseLock: () => {},
        cancel: async () => {},
      }),
    };
    routeFetch(response);
    const rec = recorder();
    const result = await makeStore().dispatch(door(rec, controller.signal));
    expect(result.error).toBeUndefined();
    expect(rec.errors).toEqual([]);
    expect(rec.completes).toBe(1);
    expect(rec.events.length).toBeGreaterThan(0);
    expect(rec.events.length).toBeLessThan(LINES.length);
  });
});
