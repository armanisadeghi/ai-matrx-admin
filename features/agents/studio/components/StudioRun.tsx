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
 * - Above the runner: "Next message on" — the composer's "This message only" model, in sight.
 */

import { useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { AgentRunner } from "@ai-matrx/chat/agents/components/smart/AgentRunner";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import { registerConversationHooks } from "@ai-matrx/chat/host";
import { useDeclaredSurfaceMandates } from "@ai-matrx/chat/surfaces/runtime/surface-mandates";
import { loadConversation } from "@ai-matrx/chat/agents/redux/execution-system/thunks/load-conversation.thunk";
import { selectOrderedMessageIds } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { StudioTurnModel } from "./StudioTurnModel";
import { PaneBar } from "./PaneBar";
import { pinToLatest } from "../pin-to-latest";

/**
 * Which conversation each launched run (agent/mandate + runKey) opened, kept ABOVE the component. A mount
 * (a window resize swapping three panes for tabs, a layout change, a parent re-key) must never start a run:
 * the only thing that launches is the person's own action (a new `runKey`, a first send). A mount that finds
 * its run already launched reopens that conversation instead.
 */
const launchedRuns = new Map<string, string>();

/** What a mount does: reopen a stored conversation, or (first time only) launch. Pure, so it is tested. */
export function mountAction(
  key: string,
  conversationId: string | null,
  runKey: number,
  launched: ReadonlyMap<string, string> = launchedRuns,
): { kind: "open"; conversationId: string } | { kind: "launch" } {
  if (conversationId && runKey === 0) return { kind: "open", conversationId };
  const known = launched.get(key);
  if (known) return { kind: "open", conversationId: known };
  return { kind: "launch" };
}

export function rememberLaunchedRun(key: string, conversationId: string): void {
  launchedRuns.set(key, conversationId);
}

export interface StudioRunSeed {
  variables?: Record<string, string>;
  userInput?: string;
}

interface StudioRunProps {
  agentId?: string | null;
  /**
   * Run through a MANDATE (the server resolves the holder; never an agent id). Used by the Studio assistant.
   * `mandateVariables` are the page's offered values (ids and where we are only; the server builds the rest)
   * and ride every turn — `everyTurnThroughMandate` — so each turn sees the current workspace.
   */
  mandateKey?: AnyMandateKey | null;
  mandateVariables?: () => Record<string, unknown>;
  /** What the mandate's agent does HERE, for the top Agents menu (the run declares the job it runs). */
  mandateDoes?: string;
  /** The surface the server resolves this chat's tool defaults from. */
  surfaceName?: string;
  conversationId?: string | null;
  surfaceKey: string;
  seed?: StudioRunSeed | null;
  showVariables?: boolean;
  runKey?: number;
  /** The "Next reply on" bar above an agent's run; off when the host draws it in its own bar (the compare). */
  turnModelBar?: boolean;
  /** Per-conversation context entries (`runtime.context`), sent with the first launch. */
  context?: Record<string, unknown>;
  onConversation?: (conversationId: string) => void;
}

export function StudioRun({
  agentId = null,
  mandateKey = null,
  mandateVariables,
  mandateDoes,
  surfaceName,
  conversationId = null,
  surfaceKey,
  seed = null,
  showVariables = false,
  runKey = 0,
  turnModelBar = true,
  context,
  onConversation,
}: StudioRunProps) {
  const { launchAgent, launchMandate } = useAgentLauncher();
  useDeclaredSurfaceMandates(mandateKey && mandateDoes ? [{ mandateKey, does: mandateDoes }] : []);
  const variablesRef = useRef(mandateVariables);
  useEffect(() => {
    variablesRef.current = mandateVariables;
  });
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [shown, setShown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A conversation reopened from the URL (a reload): it lands on the LATEST turn, not the first message. */
  const [restored, setRestored] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!restored || restored !== shown) return;
    return pinToLatest(frame.current);
  }, [restored, shown]);
  const startedFor = useRef<string | null>(null);
  const unhook = useRef<(() => void) | null>(null);
  useEffect(() => () => unhook.current?.(), []);

  useEffect(() => {
    if (!agentId && !mandateKey) return;
    const key = `${agentId ?? mandateKey}:${runKey}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    const action = mountAction(key, conversationId, runKey);
    const openId = action.kind === "open" ? action.conversationId : null;
    setShown(null);
    setError(null);

    const options = {
      initiation: "user" as const,
      surfaceKey,
      sourceFeature: "agent-studio",
      config: {
        displayMode: "direct" as const,
        autoRun: Boolean(seed),
        allowChat: true,
        showVariablePanel: showVariables,
      },
      runtime:
        seed || context || mandateKey
          ? {
              ...(seed?.variables && Object.keys(seed.variables).length > 0 ? { variables: seed.variables } : {}),
              ...(mandateKey ? { variables: variablesRef.current?.() ?? {} } : {}),
              ...(seed?.userInput ? { userInput: seed.userInput } : {}),
              ...(context ? { context } : {}),
              ...(surfaceName ? { surfaceName } : {}),
            }
          : undefined,
      onConversationCreated: (id: string) => {
        rememberLaunchedRun(key, id);
        hookUp(id);
        setShown(id);
        onConversation?.(id);
      },
    };
    const fresh = () =>
      (mandateKey ? launchMandate(mandateKey, options as never) : launchAgent(agentId as string, options as never)).catch(
        (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
      );
    // Every turn goes through the mandate with the page's CURRENT offered values (the server rebuilds the
    // workspace from the conversation id; the client sends ids and where we are, nothing else).
    const hookUp = (id: string) => {
      if (!mandateKey) return;
      unhook.current?.();
      unhook.current = registerConversationHooks(id, {
        everyTurnThroughMandate: true,
        beforeSend: async () => ({ variables: variablesRef.current?.() ?? {} }),
      });
    };

    if (openId) {
      dispatch(
        loadConversation({
          conversationId: openId,
          surfaceKey,
          displayOverrides: { displayMode: "direct", allowChat: true, autoRun: false, showVariablePanel: showVariables },
        }),
      )
        .unwrap()
        .then(() => {
          // A conversation that was opened but never sent reloads with no composer: start fresh.
          if (selectOrderedMessageIds(openId)(store.getState()).length === 0) {
            void fresh();
            return;
          }
          rememberLaunchedRun(key, openId);
          hookUp(openId);
          setRestored(openId);
          setShown(openId);
          onConversation?.(openId);
        })
        .catch(() => void fresh());
    } else {
      void fresh();
    }
  }, [agentId, mandateKey, surfaceName, launchMandate, conversationId, runKey, surfaceKey, seed, showVariables, context, launchAgent, dispatch, store, onConversation]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <CircleAlert className="h-5 w-5 text-destructive" aria-hidden />
        <p className="text-sm text-foreground">This chat could not start.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }
  if ((!agentId && !mandateKey) || !shown) return <RegionSkeleton />;
  return (
    <div ref={frame} className="flex h-full min-h-0 flex-col">
      {mandateKey || !turnModelBar ? null : (
        <PaneBar>
          <StudioTurnModel conversationId={shown} />
        </PaneBar>
      )}
      <AgentRunner conversationId={shown} surfaceKey={surfaceKey} className="min-h-0 flex-1" />
    </div>
  );
}

