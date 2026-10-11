"use client";

/**
 * One agent conversation inside a Studio pane — the shared chat, never a copy: the ONE launch
 * (`useAgentLauncher().launchAgent`, `displayMode: "direct"`, the pane owns the UI) and the ONE
 * runner (`AgentRunner`: transcript, variables, composer, every answer's actions incl. Debrief).
 *
 * - `conversationId` set → that stored conversation is reopened (`loadConversation`); if it cannot
 *   be (never sent — it would reopen with no composer — or deleted), a fresh one starts and
 *   `onConversation` reports its id.
 * - `runKey` changes → a NEW conversation (the Studio's "run again, fresh every time").
 * - `seed` set → the first turn runs at once with those inputs (mode 2's original request).
 */

import { useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { AgentRunner } from "@ai-matrx/chat/agents/components/smart/AgentRunner";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import { loadConversation } from "@ai-matrx/chat/agents/redux/execution-system/thunks/load-conversation.thunk";
import { selectOrderedMessageIds } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";

export interface StudioRunSeed {
  variables?: Record<string, string>;
  userInput?: string;
}

interface StudioRunProps {
  agentId: string | null;
  conversationId?: string | null;
  surfaceKey: string;
  seed?: StudioRunSeed | null;
  showVariables?: boolean;
  runKey?: number;
  /** Per-conversation context entries (`runtime.context`), sent with the first launch. */
  context?: Record<string, unknown>;
  onConversation?: (conversationId: string) => void;
}

export function StudioRun({
  agentId,
  conversationId = null,
  surfaceKey,
  seed = null,
  showVariables = false,
  runKey = 0,
  context,
  onConversation,
}: StudioRunProps) {
  const { launchAgent } = useAgentLauncher();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [shown, setShown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    const key = `${agentId}:${runKey}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    setShown(null);
    setError(null);

    const fresh = () =>
      launchAgent(agentId, {
        surfaceKey,
        sourceFeature: "agent-studio",
        config: {
          displayMode: "direct",
          autoRun: Boolean(seed),
          allowChat: true,
          showVariablePanel: showVariables,
        },
        runtime:
          seed || context
            ? {
                ...(seed?.variables && Object.keys(seed.variables).length > 0 ? { variables: seed.variables } : {}),
                ...(seed?.userInput ? { userInput: seed.userInput } : {}),
                ...(context ? { context } : {}),
              }
            : undefined,
        onConversationCreated: (id: string) => {
          setShown(id);
          onConversation?.(id);
        },
      }).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    if (conversationId && runKey === 0) {
      dispatch(
        loadConversation({
          conversationId,
          surfaceKey,
          displayOverrides: { displayMode: "direct", allowChat: true, autoRun: false, showVariablePanel: showVariables },
        }),
      )
        .unwrap()
        .then(() => {
          // A conversation that was opened but never sent reloads with no composer: start fresh.
          if (selectOrderedMessageIds(conversationId)(store.getState()).length === 0) {
            void fresh();
            return;
          }
          setShown(conversationId);
          onConversation?.(conversationId);
        })
        .catch(() => void fresh());
    } else {
      void fresh();
    }
  }, [agentId, conversationId, runKey, surfaceKey, seed, showVariables, context, launchAgent, dispatch, store, onConversation]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <CircleAlert className="h-5 w-5 text-destructive" aria-hidden />
        <p className="text-sm text-foreground">This chat could not start.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!agentId || !shown) return <RegionSkeleton />;
  return <AgentRunner conversationId={shown} surfaceKey={surfaceKey} className="h-full" />;
}
