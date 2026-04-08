"use client";

/**
 * AgentBuilderRightPanel — Test Run Panel
 *
 * Uses createManualInstance which reads from agentDefinition.agents[agentId] —
 * including dirty (unsaved) fields. So the test run always reflects the
 * current in-memory builder state, whether saved or not.
 *
 * Headerless, full-height, no max-width constraints. The reset action lives
 * inside AgentRequestStats (appears only after a response).
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { ArrowDown } from "lucide-react";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { CreatorRunPanel } from "../run-controls/CreatorRunPanel";
import { SmartAgentInput } from "../inputs/SmartAgentInput";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const dispatch = useAppDispatch();
  const { launchAgent } = useAgentLauncher();
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    let createdId: string | null = null;

    launchAgent(agentId, {
      sourceFeature: "agent-builder",
      autoRun: false,
      displayMode: "direct",
      useChat: true,
      autoClearConversation: true,
      conversationMode: "chat",
    })
      .then((result) => {
        createdId = result.instanceId;
        setInstanceId(result.instanceId);
      })
      .catch((err) => console.error("Failed to create test instance:", err));

    return () => {
      if (createdId) {
        dispatch(destroyInstance(createdId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {instanceId ? (
        <>
          <div className="relative flex-1 min-h-0">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto bg-background"
            >
              <AgentConversationDisplay instanceId={instanceId} />
            </div>
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-3"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, var(--background))",
              }}
            />
            {showScrollDown && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full
                  matrx-glass-core shadow-lg
                  text-muted-foreground hover:text-foreground
                  transition-all duration-200 ease-out
                  animate-in fade-in slide-in-from-bottom-2"
                title="Scroll to bottom"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}
          </div>

          <CreatorRunPanel
            instanceId={instanceId}
            onNewInstance={setInstanceId}
          />

          <SmartAgentInput
            instanceId={instanceId}
            showAutoClearToggle
            showSubmitOnEnterToggle
            onNewInstance={setInstanceId}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Initializing...
        </div>
      )}
    </div>
  );
}
