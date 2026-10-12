/**
 * lib/api/post-json-as-user.ts
 *
 * The one JSON POST for a caller that already holds a signed-in user's access
 * token and an organization (server routes and one-shot doors that cannot ride
 * the Redux-bound `callApi`). It is `@ai-matrx/api`'s `createMatrxTransport`
 * configured with a fixed base URL, the user credential and the fail-closed
 * organization binding: a write with no organization is refused before the
 * wire (`OrganizationContextError`), and the organization rides the
 * `X-Organization-Id` header only, never the body.
 *
 * Non-2xx answers throw `BackendApiError` (the server's own sentence).
 */

import {
  buildMatrxRequestUrl,
  createMatrxTransport,
  parseHttpError,
  toCredentialsPort,
} from "@ai-matrx/api";

export interface PostJsonAsUserArgs {
  /** Server origin, no path. */
  baseUrl: string;
  accessToken: string;
  /** Required for a write; null/undefined is refused before the wire. */
  organizationId: string | null | undefined;
  /** Server-relative path. */
  path: string;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

export async function postJsonAsUser<T = unknown>({
  baseUrl,
  accessToken,
  organizationId,
  path,
  body = {},
  signal,
}: PostJsonAsUserArgs): Promise<T> {
  const base = baseUrl.replace(/\/+$/, "");
  const transport = createMatrxTransport({
    baseUrl: base,
    credentials: toCredentialsPort({ kind: "user", accessToken }),
    // A getter binds the organization even when it is missing, so the call is
    // refused before the wire instead of silently sent org-less.
    organizationId: () => organizationId,
    aiApiVersion: "v1",
    source: "postJsonAsUser",
  });
  // `buildMatrxRequestUrl` owns the leading-`/api/` strip; keep its path.
  const url = buildMatrxRequestUrl(base, path);
  const response = await transport.fetch(url.slice(base.length), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw await parseHttpError(response);
  return (await response.json()) as T;
}
