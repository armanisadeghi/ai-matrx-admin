/**
 * Test support: a recording stand-in for `@/lib/api/server-api`'s `serverApi` (an `@ai-matrx/api`
 * `Api`). Every generated operation the code under test sends is recorded as
 * `{ name, method, path (filled), args, options }`, and answered from `respond` (JSON for `call`,
 * a real `Response` for `send`, so byte reads work). `url` routes `files` operations to
 * `FILES_BASE` and everything else to `SERVER_BASE`.
 *
 *   jest.mock("@/lib/api/server-api", () =>
 *     require("@/lib/api/test-support/recordingServerApi").recordingServerApiModule(),
 *   );
 *   const { serverApiCalls, respondWith } = jest.requireMock("@/lib/api/server-api");
 */

export const FILES_BASE = "https://files.matrxserver.com";
export const SERVER_BASE = "https://server.app.matrxserver.com";

interface Descriptor {
  m: string;
  p: string;
  d: string;
  n: string;
}
interface Args {
  path?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface RecordedCall {
  name: string;
  method: string;
  path: string;
  args: Args | undefined;
  options: Record<string, unknown> | undefined;
}

function fill(template: string, params?: Record<string, string | number>): string {
  return template.replace(/\{([^}]+)\}/g, (_m, key: string) => encodeURIComponent(String(params?.[key])));
}

export function recordingServerApiModule() {
  const serverApiCalls: RecordedCall[] = [];
  let respond: (call: RecordedCall) => unknown = () => ({});
  const record = (op: Descriptor, args?: Args, options?: Record<string, unknown>): RecordedCall => {
    const entry = { name: op.n, method: op.m, path: fill(op.p, args?.path), args, options };
    serverApiCalls.push(entry);
    return entry;
  };
  const serverApi = {
    url: (op: Descriptor, args?: Args) => `${op.d === "files" ? FILES_BASE : SERVER_BASE}${fill(op.p, args?.path)}`,
    call: async (op: Descriptor, args?: Args, options?: Record<string, unknown>) => respond(record(op, args, options)),
    send: async (op: Descriptor, args?: Args, options?: Record<string, unknown>) => {
      const answer = respond(record(op, args, options));
      const response = answer instanceof Response ? answer : new Response(JSON.stringify(answer ?? {}));
      return { response, requestId: String(options?.requestId ?? "req"), controller: new AbortController() };
    },
  };
  return {
    serverApi,
    serverApiCalls,
    respondWith(fn: (call: RecordedCall) => unknown) {
      respond = fn;
    },
    lastServerApiCall: () => serverApiCalls[serverApiCalls.length - 1],
    resetServerApiCalls() {
      serverApiCalls.length = 0;
      respond = () => ({});
    },
  };
}
