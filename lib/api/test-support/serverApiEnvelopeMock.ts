/**
 * Test support: stands in for `@/lib/api/server-api` in a jest.mock factory and
 * reports each generated-operation call to the old verb-shaped spies
 * (`apiGet(path, opts)`, `apiPost(path, body, opts)`, ...) with the path already
 * filled in, so a test asserts WHICH route was called with WHAT, and what the
 * route answered (`{ data }` envelopes), without a network.
 *
 *   jest.mock("@/lib/api/server-api", () =>
 *     require("@/lib/api/test-support/serverApiEnvelopeMock").serverApiEnvelopeMock({
 *       apiPost: (...a: unknown[]) => apiPost(...a),
 *     }),
 *   );
 *
 * or, with no argument, over this module's own exported spies (`apiPost`, ...).
 */

type Spy = (...args: unknown[]) => unknown;

interface Descriptor {
  m: string;
  p: string;
}
interface Args {
  path?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface VerbSpies {
  apiGet?: Spy;
  apiPost?: Spy;
  apiPatch?: Spy;
  apiPut?: Spy;
  apiDelete?: Spy;
  apiMultipart?: Spy;
}

function fill(template: string, params?: Record<string, string | number>): string {
  return template.replace(/\{([^}]+)\}/g, (_m, key: string) => encodeURIComponent(String(params?.[key])));
}

/** Shared spies, for a test that does not bring its own. */
export const apiGet = jest.fn();
export const apiPost = jest.fn();
export const apiPatch = jest.fn();
export const apiPut = jest.fn();
export const apiDelete = jest.fn();
export const apiMultipart = jest.fn();

export function serverApiEnvelopeMock(
  spies: VerbSpies = { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiMultipart },
) {
  const call = async (op: Descriptor, args?: Args, options?: Record<string, unknown>) => {
    const path = fill(op.p, args?.path);
    const opts = options && Object.keys(options).length > 0 ? options : undefined;
    const query = args?.query;
    let result: unknown;
    switch (op.m) {
      case "GET": {
        const merged = query || opts ? { ...(query ? { query } : {}), ...opts } : undefined;
        result = await (merged ? spies.apiGet?.(path, merged) : spies.apiGet?.(path));
        break;
      }
      case "DELETE":
        result = await (opts ? spies.apiDelete?.(path, opts) : spies.apiDelete?.(path));
        break;
      default: {
        const verb =
          op.m === "PATCH" ? spies.apiPatch
          : op.m === "PUT" ? spies.apiPut
          : typeof FormData !== "undefined" && args?.body instanceof FormData && spies.apiMultipart
            ? spies.apiMultipart
            : spies.apiPost;
        result = await (opts ? verb?.(path, args?.body, opts) : verb?.(path, args?.body));
      }
    }
    return (result as { data?: unknown } | undefined)?.data;
  };
  return {
    serverApi: { call, send: jest.fn(), url: jest.fn() },
    callOptionsFrom: (options: Record<string, unknown> = {}) => options,
    NO_ERROR_CAPTURE_HEADER: "x-matrx-client-capture",
  };
}
