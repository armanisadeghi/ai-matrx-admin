import type { RootState } from "@/lib/redux/store";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";

/**
 * Resolve the base URL for a conversation's outbound AI calls, with the
 * per-instance `serverOverrideUrl` taking precedence over the global
 * server selection.
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
