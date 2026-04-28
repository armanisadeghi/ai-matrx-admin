/**
 * Resolve the active sandbox binding for outbound chat / agent requests.
 *
 * When the user has a sandbox active in the editor, the matrx-ai tools
 * running inside aidream need three things to route fs/shell calls into
 * the container instead of aidream's host:
 *
 *   1. sandbox_id   — the orchestrator's sbx-XXX id
 *   2. base_url     — orchestrator URL up to /sandboxes/<id>
 *   3. access_token — short-lived, sandbox-scoped HMAC bearer
 *
 * The first two come from `codeWorkspaceSlice` (already in Redux at activate
 * time). The third is minted on demand via `POST /api/sandbox/[id]/access-tokens`
 * and cached in module scope until ~30s before expiry. This module is the
 * single place execute thunks call to attach the binding to a request.
 *
 * Returning `null` is the "no sandbox bound" signal — callers fall through
 * to multi-tenant aidream behavior.
 */

import {
  selectActiveSandboxId,
  selectActiveSandboxProxyUrl,
} from "@/features/code/redux/codeWorkspaceSlice";

export interface SandboxBindingPayload {
  sandbox_id: string;
  base_url: string;
  access_token: string;
  root_path: string;
}

interface CachedToken {
  token: string;
  /** Unix epoch seconds. We refresh ≥30s before this. */
  exp: number;
}

const TOKEN_CACHE = new Map<string, CachedToken>();
const REFRESH_LEEWAY_SECONDS = 30;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function isStillValid(cached: CachedToken | undefined): cached is CachedToken {
  return !!cached && cached.exp - REFRESH_LEEWAY_SECONDS > nowSec();
}

/**
 * Fetch (or reuse) a sandbox access token. Network call only on first use
 * or when the cached token is within `REFRESH_LEEWAY_SECONDS` of expiring.
 */
async function fetchAccessToken(sandboxRowId: string): Promise<CachedToken | null> {
  const cached = TOKEN_CACHE.get(sandboxRowId);
  if (isStillValid(cached)) return cached;

  let resp: Response;
  try {
    resp = await fetch(`/api/sandbox/${sandboxRowId}/access-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scopes: ["ai"] }),
    });
  } catch {
    return null;
  }
  if (!resp.ok) {
    return null;
  }
  const json = (await resp.json().catch(() => null)) as
    | { token?: string; exp?: number }
    | null;
  if (!json?.token || typeof json.exp !== "number") return null;

  const fresh: CachedToken = { token: json.token, exp: json.exp };
  TOKEN_CACHE.set(sandboxRowId, fresh);
  return fresh;
}

/**
 * Build the request-body sandbox block for the active sandbox, or `null`
 * if no sandbox is bound / token mint fails. Safe to call on every turn.
 *
 * Pass either a Redux `getState` function (typical from inside a thunk)
 * or the already-snapshotted state. Both signatures supported so callers
 * don't have to wrap.
 */
export async function getActiveSandboxBinding(
  stateOrGetState: unknown | (() => unknown),
): Promise<SandboxBindingPayload | null> {
  const state =
    typeof stateOrGetState === "function"
      ? (stateOrGetState as () => unknown)()
      : stateOrGetState;
  const sandboxRowId = selectActiveSandboxId(state as never);
  const proxyUrl = selectActiveSandboxProxyUrl(state as never);
  if (!sandboxRowId || !proxyUrl) return null;

  // The proxy_url shape is `<orchestrator>/sandboxes/sbx-XXX/proxy`.
  // The orchestrator's structured fs/exec endpoints live one level up at
  // `<orchestrator>/sandboxes/sbx-XXX/...`, so strip the trailing `/proxy`.
  const baseUrl = proxyUrl.replace(/\/proxy\/?$/, "").replace(/\/$/, "");

  // Pull the orchestrator-side sandbox_id out of the URL — the segment
  // right after `/sandboxes/`. This is the id matrx-ai needs to log /
  // surface; tools never use it for routing (base_url is enough).
  const sandboxIdMatch = baseUrl.match(/\/sandboxes\/([^/]+)/);
  const sandboxId = sandboxIdMatch?.[1] ?? "";

  const token = await fetchAccessToken(sandboxRowId);
  if (!token) return null;

  return {
    sandbox_id: sandboxId,
    base_url: baseUrl,
    access_token: token.token,
    root_path: "/home/agent",
  };
}

export function clearSandboxBindingCache(sandboxRowId?: string) {
  if (sandboxRowId) TOKEN_CACHE.delete(sandboxRowId);
  else TOKEN_CACHE.clear();
}
