/**
 * lib/api/chat-host-api.ts
 *
 * The three path-keyed verbs (`apiGet` / `apiPost` / `apiPatch`) and `buildPath` that
 * the `@ai-matrx/chat` package's HOST CONTRACT requires (`host/defaults/server-api.ts`
 * there declares them as host-provided dependencies), bound to the generated `paths`
 * so the chat package's own calls stay contract-checked.
 *
 * Every feature of the website calls generated operations through `serverApi`
 * (`lib/api/server-api.ts`) instead. This file exists ONLY for `chat-server-api.ts`
 * and goes away when the chat package calls `@ai-matrx/api/<domain>` operations
 * itself (3 call sites: mandates/service, action-requests/self-service,
 * voice-agent/realtimeToolService).
 */

import type { paths } from "@ai-matrx/api/types";
import {
  getJson,
  patchJson,
  postJson,
  type RequestOptions,
  type ResponseMeta,
} from "@/lib/python-client";

// ---------------------------------------------------------------------------
// Contract-derivation helpers (type-level only — zero runtime cost)
// ---------------------------------------------------------------------------

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** Every path literal in the contract that defines a real operation for M. */
export type PathWith<M extends HttpMethod> = {
  [P in keyof paths]: paths[P] extends Record<M, infer Op>
    ? Op extends undefined | never
      ? never
      : P
    : never;
}[keyof paths];

/** The operation object registered for (path P, method M). */
type OpOf<P extends keyof paths, M extends HttpMethod> = paths[P] extends Record<
  M,
  infer O
>
  ? O
  : never;

/** JSON request body of an operation. `undefined` when the body is optional. */
export type JsonBodyOf<O> = O extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : O extends { requestBody?: { content: { "application/json": infer B } } }
    ? B | undefined
    : never;

/** The 2xx `application/json` success payload of an operation. */
export type OkJsonOf<O> = O extends {
  responses: { 200: { content: { "application/json": infer T } } };
}
  ? T
  : O extends { responses: { 201: { content: { "application/json": infer T } } } }
    ? T
    : O extends { responses: { 204: unknown } }
      ? null
      : unknown;

// Convenience aliases keyed by (path, method).
type PostBody<P extends keyof paths> = JsonBodyOf<OpOf<P, "post">>;
type PatchBody<P extends keyof paths> = JsonBodyOf<OpOf<P, "patch">>;

type GetResult<P extends keyof paths> = OkJsonOf<OpOf<P, "get">>;
type PostResult<P extends keyof paths> = OkJsonOf<OpOf<P, "post">>;
type PatchResult<P extends keyof paths> = OkJsonOf<OpOf<P, "patch">>;

type Envelope<T> = Promise<{ data: T; meta: ResponseMeta }>;

// ---------------------------------------------------------------------------
// Path-parameter interpolation
// ---------------------------------------------------------------------------

/**
 * Fill a path template's `{param}` slots while keeping the *template* literal
 * (not the interpolated runtime string) as the type the client checks against
 * `paths`. Usage:
 *
 *   apiGet(buildPath("/assets/{file_id}", { file_id }))
 *
 * The returned branded string carries the template's literal type so the call
 * still resolves to the correct operation.
 */
export function buildPath<P extends keyof paths>(
  template: P,
  params: Record<string, string | number>,
): P {
  return (template as string).replace(/\{([^}]+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v === undefined) {
      throw new Error(
        `buildPath: missing path parameter "${k}" for template "${String(template)}"`,
      );
    }
    return encodeURIComponent(String(v));
  }) as P;
}

// ---------------------------------------------------------------------------
// Contract-bound verbs
// ---------------------------------------------------------------------------

/** A query-string value; `null`/`undefined` entries are dropped. */
export type QueryScalar = string | number | boolean | null | undefined;
/** A query value: a scalar, or an array emitted as REPEATED params (`?k=a&k=b`). */
export type QueryValue = QueryScalar | readonly QueryScalar[];

/** Append a query object to a path literal, dropping empty values. */
export function withQuery<P extends string>(
  path: P,
  query?: Record<string, QueryValue>,
): P {
  if (!query) return path;
  const qs = new URLSearchParams();
  const appendScalar = (k: string, v: QueryScalar) => {
    // Drop null / undefined / empty-string so absent params stay absent
    // (an empty value must not become `?k=` — that can change server behavior).
    if (v === null || v === undefined || v === "") return;
    qs.append(k, String(v));
  };
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) {
      // Arrays → repeated params (`?k=a&k=b`), matching FastAPI's List[str]
      // query parsing. An empty array emits nothing.
      for (const item of v) appendScalar(k, item);
    } else {
      appendScalar(k, v as QueryScalar);
    }
  }
  const s = qs.toString();
  return (s ? `${path}${path.includes("?") ? "&" : "?"}${s}` : path) as P;
}

/**
 * GET a JSON endpoint. Response is derived from the contract; the path literal
 * stays contract-checked even with query params (passed via `opts.query`, which
 * `withQuery` serializes onto the URL).
 */
export function apiGet<P extends PathWith<"get">>(
  path: P,
  opts?: RequestOptions & { query?: Record<string, QueryValue> },
): Envelope<GetResult<P>> {
  const { query, ...rest } = opts ?? {};
  return getJson<GetResult<P>>(withQuery(path, query), rest);
}

/** POST a JSON body. Body AND response are derived from the contract. */
export function apiPost<P extends PathWith<"post">>(
  path: P,
  body: PostBody<P> extends never ? undefined : PostBody<P>,
  opts?: RequestOptions,
): Envelope<PostResult<P>> {
  return postJson<PostResult<P>, PostBody<P>>(path, body as PostBody<P>, opts);
}

/** PATCH a JSON body. Body AND response are derived from the contract. */
export function apiPatch<P extends PathWith<"patch">>(
  path: P,
  body: PatchBody<P>,
  opts?: RequestOptions,
): Envelope<PatchResult<P>> {
  return patchJson<PatchResult<P>, PatchBody<P>>(path, body, opts);
}
