"use client";

/**
 * useAgentBootstrap — Single orchestration point for all agent data fetching
 * within the ssr/chat layout.
 *
 * Called ONCE from ChatPanelContent (the first persistent client component in
 * the layout). Handles Tier 1 and Tier 3 at the right time and place:
 *
 *   Tier 1 — Slim list (names + basics):
 *     Dispatched once on mount via initializeAgents().
 *     Guarded by TTL inside the thunk — no double-fetching within 15 min.
 *     Also wired to tab-visibility stale-while-revalidate.
 *
 *   Tier 2 — Core (descriptions, tags, etc.):
 *     Owned by AgentPickerSheet via autoUpgradeToCore when the picker opens.
 *     Not touched here.
 *
 *   Tier 3 — Operational (variableDefaults, dynamicModel, settings):
 *     Triggered whenever an agentId appears in the URL — either the
 *     /ssr/chat/a/[agentId] route or the ?agent=[agentId] search param.
 *     Dispatches fetchAgentOperational (idempotent via the thunk's own guard),
 *     then hydrates activeChatSlice with the full config.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  initializeAgents,
  fetchAgentOperational,
  refreshAgents,
  isTabStale,
} from "@/lib/redux/thunks/agentFetchThunks";
import {
  activeChatActions,
  selectActiveChatAgent,
  type ActiveChatAgent,
} from "@/lib/redux/slices/activeChatSlice";
import type {
  AgentRecord,
  AgentSource,
} from "@/lib/redux/slices/agentCacheSlice";
import type { PromptSettings } from "@/features/prompts/types/core";
import { DEFAULT_AGENTS } from "@/features/cx-chat/components/agent/local-agents";
import type { RootState } from "@/lib/redux/store";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract agentId from pathname + searchParams.
 * Supports /ssr/chat/a/[agentId] and /ssr/chat/c/[id]?agent=[agentId].
 */
function resolveAgentIdFromUrl(
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  const agentRouteMatch = pathname.match(/\/ssr\/chat\/a\/([^/]+)/);
  if (agentRouteMatch?.[1]) return agentRouteMatch[1];

  const agentParam = searchParams.get("agent");
  if (agentParam) return agentParam;

  return null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAgentBootstrap() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedAgent = useAppSelector(selectActiveChatAgent);

  // Track the last agentId we handled to prevent redundant Tier 3 fetches.
  const lastOperationalId = useRef<string | null>(null);
  const lastVisible = useRef<number>(Date.now());

  // ── Tier 1: Slim list — once on mount, then TTL-guarded ──────────────────
  useEffect(() => {
    dispatch(initializeAgents());
  }, [dispatch]);

  // ── Tab visibility stale-while-revalidate ────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        lastVisible.current = Date.now();
        return;
      }
      // Re-read state at call time — avoid stale closure
      dispatch((_, getState: () => RootState) => {
        if (isTabStale(getState())) {
          dispatch(refreshAgents());
        }
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [dispatch]);

  // ── Tier 3: Operational fetch — triggered by URL ──────────────────────────
  useEffect(() => {
    const agentId = resolveAgentIdFromUrl(pathname, searchParams);

    // No agent in URL — nothing to fetch
    if (!agentId) return;

    // Already handled this exact agentId — skip (thunk is idempotent too, but
    // avoiding the dispatch entirely is cleaner)
    if (agentId === lastOperationalId.current) return;
    lastOperationalId.current = agentId;

    // Fast path: hardcoded DEFAULT_AGENT — no DB fetch needed
    const builtIn = DEFAULT_AGENTS.find((a) => a.promptId === agentId);
    if (builtIn) {
      if (selectedAgent.promptId !== agentId || !selectedAgent.configFetched) {
        dispatch(
          activeChatActions.setSelectedAgent({
            promptId: builtIn.promptId,
            name: builtIn.name,
            description: builtIn.description,
            variableDefaults: builtIn.variableDefaults,
            configFetched: true,
          }),
        );
      }
      return;
    }

    // All user-created agents live in "prompts" source.
    // Builtins in DB (not in DEFAULT_AGENTS) are rare; the thunk handles them.
    const source: AgentSource = "prompts";

    dispatch(fetchAgentOperational({ id: agentId, source })).then((action) => {
      // fetchAgentOperational.fulfilled carries AgentRecord | null as payload
      if (action.type !== fetchAgentOperational.fulfilled.type) return;

      const record = action.payload as AgentRecord | null;

      if (!record) {
        // Agent not found in DB — mark as fetched so UI doesn't keep waiting
        dispatch(
          activeChatActions.setSelectedAgent({
            promptId: agentId,
            name: selectedAgent.promptId === agentId ? selectedAgent.name : "",
            configFetched: true,
          }),
        );
        return;
      }

      // Pull settings apart: model_id + runtime settings (everything except tools)
      const agentSettings = record.settings ?? {};
      const { model_id, tools: _tools, ...runtimeSettings } = agentSettings;
      const modelId = typeof model_id === "string" ? model_id : null;

      // Hydrate activeChatSlice with the full operational config
      dispatch(
        activeChatActions.setSelectedAgent({
          promptId: record.id,
          name:
            record.name ||
            (selectedAgent.promptId === agentId ? selectedAgent.name : ""),
          description: record.description,
          variableDefaults:
            record.variableDefaults as ActiveChatAgent["variableDefaults"],
          dynamicModel: record.dynamicModel,
          configFetched: true,
        }),
      );

      // Apply model override and runtime settings for dirty-detection
      if (modelId) {
        dispatch(activeChatActions.setModelOverride(modelId));
      }
      if (Object.keys(runtimeSettings).length > 0) {
        dispatch(
          activeChatActions.setAgentDefaultSettings(
            runtimeSettings as PromptSettings,
          ),
        );
      }
    });
    // pathname and searchParams change on every navigation — that's our trigger.
    // We intentionally exclude dispatch and selectedAgent to avoid re-running on
    // Redux updates; lastOperationalId.current is our guard against duplicates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);
}
