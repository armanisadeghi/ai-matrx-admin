"use client";

/**
 * ChatInstanceManager
 *
 * Page-level client component. Owns instance lifecycle for the chat route.
 * Renders the correct content component once instanceId is resolved.
 *
 * Why no render prop / children function:
 *   Server components cannot serialize functions — passing `children` as a
 *   function from a server page to a client component fails at the
 *   server/client boundary with "Functions are not valid as a child".
 *   Instead, this component accepts a `mode` and the minimal serializable
 *   props for that mode, then renders the correct client component itself.
 *
 * Modes:
 *   "welcome"      → ChatWelcomeClient  (agentId, agentName, agentDescription)
 *   "conversation" → ChatConversationClient  (conversationId, agentId)
 *
 * Instance reuse:
 *   A ref maps agentId → instanceId within the same browser session.
 *   Navigating back to a previously used agent reuses its instance,
 *   preserving variable values, input text, and conversation context.
 *   Hard refresh clears all instances; a fresh one is created.
 */

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { fetchConversationHistory } from "@/features/cx-chat/redux/thunks";
import { selectInstanceIdByConversationId } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import ChatWelcomeClient from "@/features/cx-chat/components/ChatWelcomeClient";
import ChatConversationClient from "@/features/cx-chat/components/core/ChatConversationClient";
import type { RootState } from "@/lib/redux/store";

// ── Props ─────────────────────────────────────────────────────────────────────

type WelcomeMode = {
  mode: "welcome";
  agentId: string;
  agentName: string;
  agentDescription?: string;
};

type ConversationMode = {
  mode: "conversation";
  agentId: string;
  conversationId: string;
};

type ChatInstanceManagerProps = WelcomeMode | ConversationMode;

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatInstanceManager(props: ChatInstanceManagerProps) {
  const dispatch = useAppDispatch();
  const [instanceId, setInstanceId] = useState<string | null>(null);

  const { agentId } = props;
  const conversationId =
    props.mode === "conversation" ? props.conversationId : undefined;

  // Per-agent reuse map — session-local ref, not Redux, not context.
  const instanceByAgentId = useRef<Map<string, string>>(new Map());

  // Guard against re-running for the same (agentId, conversationId) pair.
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${agentId}::${conversationId ?? ""}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    setInstanceId(null);

    (async () => {
      // 1. For conversation routes: check if an instance already owns this
      //    conversationId (stream started on the welcome screen and the router
      //    navigated here mid-stream or just after). Reuse it directly so the
      //    stream continues uninterrupted — no DB fetch needed.
      if (conversationId) {
        const existingId = await dispatch(
          (_: unknown, getState: () => RootState) =>
            selectInstanceIdByConversationId(conversationId)(getState()),
        );
        if (existingId) {
          instanceByAgentId.current.set(agentId, existingId);
          setInstanceId(existingId);
          return;
        }
      }

      // 2. Ensure agent execution data (variables, context slots) is loaded.
      await dispatch(fetchAgentExecutionMinimal(agentId));

      // 3. Reuse a previously created instance for this agent if still alive.
      let resolvedId: string | null = null;
      const cached = instanceByAgentId.current.get(agentId);
      if (cached) {
        const stillAlive = await dispatch(
          (_: unknown, getState: () => RootState) =>
            !!getState().executionInstances.byInstanceId[cached],
        );
        if (stillAlive) resolvedId = cached;
      }

      // 4. Create a fresh instance when nothing is reusable.
      if (!resolvedId) {
        const result = await dispatch(createManualInstance({ agentId }));
        if (createManualInstance.fulfilled.match(result)) {
          resolvedId = result.payload;
        }
      }

      if (!resolvedId) return;

      // 5. Persist for reuse within this session.
      instanceByAgentId.current.set(agentId, resolvedId);

      // 6. Load conversation history from DB. The thunk is idempotent —
      //    it skips the fetch if history is already loaded for this instance.
      if (conversationId) {
        dispatch(
          fetchConversationHistory({ conversationId, instanceId: resolvedId }),
        );
      }

      // 7. Expose instanceId — triggers re-render with the real content.
      setInstanceId(resolvedId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, conversationId]);

  // While resolving: render nothing (parent Suspense shows skeleton).
  if (!instanceId) return null;

  // ── Render the correct content component ──────────────────────────────────
  if (props.mode === "welcome") {
    return (
      <ChatWelcomeClient
        agentId={props.agentId}
        agentName={props.agentName}
        agentDescription={props.agentDescription}
        instanceId={instanceId}
      />
    );
  }

  return (
    <ChatConversationClient
      conversationId={props.conversationId}
      agentId={props.agentId}
      instanceId={instanceId}
    />
  );
}
