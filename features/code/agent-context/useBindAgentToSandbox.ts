"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setServerOverrideUrl,
  setServerOverrideAuthToken,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { selectEditorMode } from "../redux/codeWorkspaceSlice";
import { useSandboxAccessToken } from "./useSandboxAccessToken";

/**
 * Bind a chat conversation to a sandbox-specific backend URL **and** the
 * matching short-lived bearer token while the editor surface is in
 * **sandbox mode**.
 *
 * Why this hook:
 *   - In sandbox mode the agent's Python server runs **inside the
 *     container**. AI calls from this conversation should hit
 *     `${proxyUrl}/...` instead of the globally-selected backend.
 *   - The orchestrator authenticates browser-direct calls with a per-
 *     sandbox bearer token (NOT the user's Supabase JWT). This hook
 *     mints+caches that token alongside the URL so the agent execute
 *     thunks can pull both from `instanceUIState` in one read.
 *   - We don't flip `apiConfigSlice.activeServer` because that would
 *     redirect every other backend call in the page (cloud-files,
 *     prompt-apps, agent definitions, etc.). The override is scoped to
 *     this single conversation.
 *
 * Lifecycle:
 *   - On mount (or whenever `proxyUrl`/`sandboxRowId`/`editorMode` change):
 *     when in sandbox mode AND a `proxyUrl` is provided, dispatch
 *     `setServerOverrideUrl(proxyUrl)`. Concurrently mint a token via
 *     `useSandboxAccessToken(sandboxRowId)`; once it lands, dispatch
 *     `setServerOverrideAuthToken(token)` so the next AI call carries
 *     `Authorization: Bearer <token>`.
 *   - Token refreshes (every ~15 min minus 30s) re-dispatch the new value.
 *   - On unmount, on conversation change, or when leaving sandbox mode:
 *     dispatch `null` for both URL and token to revert.
 *
 * The hook is a no-op until BOTH `conversationId` and `proxyUrl` are
 * provided. Pass `null` to disable binding (e.g. while waiting for the
 * orchestrator to surface the per-sandbox proxy URL).
 *
 * Usage:
 * ```tsx
 * useBindAgentToSandbox({
 *   conversationId,
 *   proxyUrl: instance?.proxy_url ?? null,
 *   sandboxRowId: instance?.id ?? null,
 * });
 * ```
 *
 * Multiple conversations can be bound to the same sandbox URL — each
 * call writes to its own `byConversationId[conversationId]` entry.
 */
export interface UseBindAgentToSandboxOptions {
  conversationId: string | null | undefined;
  /**
   * Sandbox-aware base URL — typically the orchestrator's per-instance
   * proxy (e.g. `https://orchestrator.dev.codematrx.com/sandboxes/<id>/proxy`).
   * `null` disables binding.
   */
  proxyUrl: string | null | undefined;
  /**
   * Local sandbox row UUID (NOT the orchestrator's `sandbox_id`). Required
   * for the token-mint route to look up tier + ownership. `null` disables
   * token minting; the URL override still binds in that case but AI calls
   * will 401 at the proxy.
   */
  sandboxRowId?: string | null | undefined;
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
  sandboxRowId,
  force = false,
}: UseBindAgentToSandboxOptions): void {
  const dispatch = useAppDispatch();
  const editorMode = useAppSelector(selectEditorMode);

  const shouldBind =
    Boolean(conversationId) &&
    Boolean(proxyUrl) &&
    (force || editorMode === "sandbox");

  // Only mint a token while the binding is actually live — we don't want
  // to spend orchestrator quota for every editor surface that mounts.
  const tokenSandboxId = shouldBind ? (sandboxRowId ?? null) : null;
  const { token: bearerToken } = useSandboxAccessToken({
    sandboxRowId: tokenSandboxId,
  });

  // Track the last conversation/url we wrote so we can clear it when the
  // binding key changes — without this, switching sandboxes would leak
  // the old URL/token onto the previous conversation.
  const lastWriteRef = useRef<{ conversationId: string; url: string } | null>(
    null,
  );

  // ── URL binding ───────────────────────────────────────────────────────────
  useEffect(() => {
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
      // The slice clears the paired token automatically when url goes null,
      // but we also dispatch explicitly so the change is visible in devtools.
      dispatch(
        setServerOverrideAuthToken({
          conversationId: last.conversationId,
          token: null,
        }),
      );
      lastWriteRef.current = null;
    }

    if (shouldBind && conversationId && proxyUrl) {
      dispatch(setServerOverrideUrl({ conversationId, url: proxyUrl }));
      lastWriteRef.current = { conversationId, url: proxyUrl };
    }
  }, [conversationId, proxyUrl, shouldBind, dispatch]);

  // ── Token binding (independent of URL effect so token refreshes don't
  // re-write the URL — they should just update the bearer in place). ────
  useEffect(() => {
    if (!shouldBind || !conversationId) return;
    dispatch(
      setServerOverrideAuthToken({
        conversationId,
        token: bearerToken ?? null,
      }),
    );
  }, [conversationId, bearerToken, shouldBind, dispatch]);

  // ── Final teardown on unmount. Separate effect so the cleanup fires even
  // when only `conversationId` changes (the main effect handles that case
  // explicitly above; this guards the unmount path). ───────────────────────
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
        dispatch(
          setServerOverrideAuthToken({
            conversationId: last.conversationId,
            token: null,
          }),
        );
        lastWriteRef.current = null;
      }
    };
  }, [dispatch]);
}
