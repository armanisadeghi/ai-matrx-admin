import type { RootState } from "@/lib/redux/store";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import {
  selectAccessToken,
  selectFingerprintId,
} from "@/lib/redux/slices/userSlice";

export type BackendChannel = "global" | "override";

export interface ResolvedBackend {
  /** Fully-qualified base URL with no trailing slash. */
  baseUrl: string;
  /** "global" = central server (Supabase JWT auth). "override" = sandbox proxy (orchestrator-minted bearer auth). */
  channel: BackendChannel;
  /** Headers to include on every fetch — Content-Type + auth. */
  headers: Record<string, string>;
}

/**
 * Resolve the **base URL only** for a conversation's outbound AI calls.
 *
 * Why this exists:
 *   - The cloud → sandbox boundary needs to be conversation-scoped, not
 *     global. A user can have one chat going against the central server
 *     while another chat (running in /sandbox/[id]) talks to the in-
 *     container Python through the orchestrator proxy. We can't flip
 *     `apiConfigSlice.activeServer` for one and leave the other alone.
 *   - Every other backend call in the page (cloud-files, prompts, agent
 *     definitions) should keep using `selectResolvedBaseUrl` directly —
 *     the override is a deliberately narrow channel for AI execute calls.
 *
 * Returns the override when present, the global resolved URL otherwise,
 * or `null` if neither is configured (caller is responsible for
 * throwing a meaningful error). The returned string never has a
 * trailing slash so callers can append `/ai/...` paths verbatim.
 *
 * For new callers, prefer `resolveBackendForConversation` — it returns
 * the URL **plus** the matching auth headers in one shot, so a thunk
 * never has to know which auth scheme each channel uses.
 */
export function resolveBaseUrlForConversation(
  state: RootState,
  conversationId: string,
): string | null {
  const override =
    state.instanceUIState?.byConversationId?.[conversationId]
      ?.serverOverrideUrl;
  if (override) {
    return override.endsWith("/") ? override.slice(0, -1) : override;
  }
  const resolved = selectResolvedBaseUrl(state);
  if (!resolved) return null;
  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
}

/**
 * Resolve the full **backend channel** (URL + auth headers) for a
 * conversation.
 *
 * Auth is **identical** on both channels — the user's Supabase JWT
 * (`Authorization: Bearer <jwt>`) when signed in, falling back to
 * `X-Fingerprint-ID` for guest sessions. The override channel is just a
 * URL swap: the in-container Python server is the same codebase as the
 * central server and authenticates the same way (the conversation row
 * is owned by the user's Supabase identity, not by the sandbox).
 *
 * The sandbox-minted bearer token (`serverOverrideAuthToken`) is kept
 * in Redux for *other* direct-orchestrator paths (streaming exec, PTY,
 * fs-watch, bulk transfer — see `SANDBOX_DIRECT_ENDPOINTS.md §3`) but
 * is deliberately NOT layered onto `/ai/*` calls here. Replacing the
 * Supabase JWT with the sandbox token caused the in-container server
 * to lose user identity → RLS hid the conversation → 404
 * "Conversation not found".
 *
 * Returns `null` when no URL is configured — caller surfaces the error.
 */
export function resolveBackendForConversation(
  state: RootState,
  conversationId: string,
): ResolvedBackend | null {
  const entry =
    state.instanceUIState?.byConversationId?.[conversationId] ?? null;
  const overrideUrl = entry?.serverOverrideUrl ?? null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Same auth on both channels — Supabase JWT first, fingerprint fallback.
  // The override is a URL swap, nothing more.
  const accessToken = selectAccessToken(state);
  const fingerprintId = selectFingerprintId(state);
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (fingerprintId) {
    headers["X-Fingerprint-ID"] = fingerprintId;
  }

  if (overrideUrl) {
    const baseUrl = overrideUrl.endsWith("/")
      ? overrideUrl.slice(0, -1)
      : overrideUrl;
    return { baseUrl, channel: "override", headers };
  }

  const resolved = selectResolvedBaseUrl(state);
  if (!resolved) return null;
  const baseUrl = resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
  return { baseUrl, channel: "global", headers };
}
