"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setServerOverrideUrl } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { selectEditorMode } from "../redux/codeWorkspaceSlice";

/**
 * Bind a chat conversation to a sandbox-specific backend URL while the
 * editor surface is in **sandbox mode**.
 *
 * Why this hook:
 *   - In sandbox mode the agent's Python server runs **inside the
 *     container**. AI calls from this conversation should hit
 *     `https://orchestrator.../sandboxes/<id>/proxy/...` instead of the
 *     globally-selected backend.
 *   - We don't want to flip `apiConfigSlice.activeServer` because that
 *     would redirect every other backend call in the page (cloud-files,
 *     prompt-apps, agent definitions, etc.). The override is scoped to
 *     this single conversation via `instanceUIState.serverOverrideUrl`.
 *
 * Lifecycle:
 *   - On mount (or whenever `proxyUrl` / `editorMode` changes): if the
 *     editor is in sandbox mode AND a `proxyUrl` is provided, dispatch
 *     `setServerOverrideUrl` with the URL.
 *   - On unmount, on conversation change, or when leaving sandbox mode:
 *     dispatch with `null` to revert to the global default.
 *
 * The hook is a no-op until BOTH `conversationId` and `proxyUrl` are
 * provided. Pass `null` for either to disable binding (e.g. while
 * waiting for the orchestrator to surface the per-sandbox proxy URL).
 *
 * Usage:
 * ```tsx
 * useBindAgentToSandbox({
 *   conversationId,
 *   proxyUrl: sandboxInstance?.proxy_url ?? null,
 * });
 * ```
 *
 * Multiple conversations can be bound to the same sandbox URL — each
 * call writes to its own `byConversationId[conversationId]` entry.
 */
export interface UseBindAgentToSandboxOptions {
  conversationId: string | null | undefined;
  /**
   * Sandbox-aware base URL. Typically the orchestrator's per-instance
   * proxy (e.g. `https://orchestrator.dev.codematrx.com/sandboxes/<id>/proxy`)
   * or the in-container Python public hostname. `null` disables binding.
   */
  proxyUrl: string | null | undefined;
  /**
   * When true, bind regardless of `editorMode`. Default `false` — only
   * bind when the editor is in `"sandbox"` mode. Set this if the caller
   * already gates the hook on adapter type.
   */
  force?: boolean;
}

export function useBindAgentToSandbox({
  conversationId,
  proxyUrl,
  force = false,
}: UseBindAgentToSandboxOptions): void {
  const dispatch = useAppDispatch();
  const editorMode = useAppSelector(selectEditorMode);

  // Track the last conversation/url we wrote so we can clear it when
  // the binding key changes — without this, switching sandboxes would
  // leak the old URL onto the previous conversation.
  const lastWriteRef = useRef<{ conversationId: string; url: string } | null>(
    null,
  );

  useEffect(() => {
    const shouldBind =
      Boolean(conversationId) &&
      Boolean(proxyUrl) &&
      (force || editorMode === "sandbox");

    // Drop a previous binding whenever conversation or url changes —
    // even if shouldBind is true with new values, the old entry needs
    // clearing first to keep state honest.
    const last = lastWriteRef.current;
    if (
      last &&
      (!shouldBind ||
        last.conversationId !== conversationId ||
        last.url !== proxyUrl)
    ) {
      dispatch(
        setServerOverrideUrl({
          conversationId: last.conversationId,
          url: null,
        }),
      );
      lastWriteRef.current = null;
    }

    if (shouldBind && conversationId && proxyUrl) {
      dispatch(setServerOverrideUrl({ conversationId, url: proxyUrl }));
      lastWriteRef.current = { conversationId, url: proxyUrl };
    }
  }, [conversationId, proxyUrl, editorMode, force, dispatch]);

  // Final teardown on unmount. Separate effect so the cleanup fires even
  // when only `conversationId` changes (the main effect handles that
  // case explicitly above; this guards the unmount path).
  useEffect(() => {
    return () => {
      const last = lastWriteRef.current;
      if (last) {
        dispatch(
          setServerOverrideUrl({
            conversationId: last.conversationId,
            url: null,
          }),
        );
        lastWriteRef.current = null;
      }
    };
  }, [dispatch]);
}
