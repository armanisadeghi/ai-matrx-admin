"use client";

/**
 * AgentFloatingChat
 *
 * Two-phase floating agent execution:
 *
 * Phase 1 — Pre-execution gate (when usePreExecutionInput is active):
 *   Renders a compact, centered card with SmartAgentInput (variables,
 *   resources, audio) and Continue/Skip + Cancel icons. No WindowPanel chrome.
 *
 * Phase 2 — Full chat (after gate clears or when no gate):
 *   Renders inside a draggable/resizable WindowPanel at ~60vh.
 *   Title animates from agent name → conversation label.
 *
 * This split avoids the giant empty shell problem — the pre-execution
 * input is only as big as its content.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectPreExecutionMessage,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { useInstanceTitle } from "@/features/agents/hooks/useInstanceTitle";
import { selectConversationTitle } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { selectHasUserInput } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { AgentRunner } from "../smart/AgentRunner";
import { SmartAgentInput } from "../smart/SmartAgentInput";
import { useUrlSync } from "@/features/floating-window-panel/url-sync/useUrlSync";
import { cn } from "@/lib/utils";

interface AgentFloatingChatProps {
  instanceId: string;
  onClose: () => void;
}

// ─── Animated title hook ──────────────────────────────────────────────────────

function useAnimatedTitle(instanceId: string) {
  const resolvedTitle = useInstanceTitle(instanceId);
  const conversationTitle = useAppSelector(selectConversationTitle(instanceId));

  const [displayTitle, setDisplayTitle] = useState(resolvedTitle ?? "Agent");
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversationTitle && conversationTitle !== prevRef.current) {
      prevRef.current = conversationTitle;
      setDisplayTitle(conversationTitle);
    }
  }, [conversationTitle]);

  useEffect(() => {
    if (!conversationTitle && resolvedTitle) {
      setDisplayTitle(resolvedTitle);
    }
  }, [resolvedTitle, conversationTitle]);

  return displayTitle;
}

// ─── Pre-execution compact card (portalled, no WindowPanel) ──────────────────

function PreExecutionCard({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const title = useInstanceTitle(instanceId);
  const hasInput = useAppSelector(selectHasUserInput(instanceId));
  const preExecutionMessage = useAppSelector(
    selectPreExecutionMessage(instanceId),
  );

  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const handleContinue = () => {
    dispatch(setPreExecutionSatisfied({ instanceId, value: true }));
  };

  const handleCancel = () => {
    dispatch(destroyInstance(instanceId));
    onClose();
  };

  const card = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={handleCancel}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-sm mx-4",
          "rounded-xl bg-card/98 backdrop-blur-md border border-border shadow-2xl",
          "overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <p className="text-sm font-medium text-foreground truncate flex-1">
            {title ?? "Please enter details..."}
          </p>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="h-6 w-6 flex items-center justify-center rounded-md text-primary hover:text-primary hover:bg-primary/10 transition-colors"
              title={hasInput ? "Continue" : "Skip"}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {preExecutionMessage && (
          <div className="px-4 pb-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {preExecutionMessage}
            </p>
          </div>
        )}

        <div className="px-3 pt-0.5 pb-3">
          <SmartAgentInput
            instanceId={instanceId}
            compact
            placeholder="Additional instructions (optional)..."
            showSubmitOnEnterToggle={false}
            showAutoClearToggle={false}
            disableSend
          />
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(card, portalTarget) : null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function AgentFloatingChat({
  instanceId,
  onClose,
}: AgentFloatingChatProps) {
  const displayTitle = useAnimatedTitle(instanceId);
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );

  useUrlSync("agent", instanceId, { m: "fc" });

  if (needsPreExecution) {
    return <PreExecutionCard instanceId={instanceId} onClose={onClose} />;
  }

  return (
    <WindowPanel
      title={displayTitle}
      onClose={onClose}
      initialRect={{
        width: 420,
        height: Math.round(
          typeof window !== "undefined" ? window.innerHeight * 0.6 : 600,
        ),
      }}
      minWidth={320}
      minHeight={280}
      bodyClassName="p-0"
    >
      <AgentRunner instanceId={instanceId} compact className="h-full" />
    </WindowPanel>
  );
}
