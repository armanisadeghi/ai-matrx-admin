"use client";

/**
 * AgentFloatingChat
 *
 * A standalone, OS-style floating window for agent execution.
 * Uses WindowPanel for full drag/resize/minimize/maximize support.
 *
 * Features:
 *   - Title starts with the agent name, then animated-swaps to the
 *     conversation label once the server sends `conversation_labeled`.
 *   - Writes URL params (rcd, rci) for future deep-link restoration.
 *     Multiple instances append indexed keys (rcd0/rci0, rcd1/rci1, ...).
 *   - Fully self-contained — receives only instanceId + onClose.
 *   - Renders AgentRunner inside for full execution lifecycle.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectInstanceAgentName,
  selectInstanceTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  selectConversationTitle,
  selectStoredConversationId,
} from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { WindowPanel } from "@/components/official-candidate/floating-window-panel/WindowPanel";
import { AgentRunner } from "../smart/AgentRunner";
import { useUrlSync } from "@/components/official-candidate/floating-window-panel/url-sync/useUrlSync";

interface AgentFloatingChatProps {
  instanceId: string;
  onClose: () => void;
}

function useAnimatedTitle(instanceId: string) {
  const agentName = useAppSelector(selectInstanceAgentName(instanceId));
  const conversationTitle = useAppSelector(selectConversationTitle(instanceId));
  const instanceTitle = useAppSelector(selectInstanceTitle(instanceId));

  const [displayTitle, setDisplayTitle] = useState(
    instanceTitle ?? agentName ?? "Agent",
  );
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversationTitle && conversationTitle !== prevRef.current) {
      prevRef.current = conversationTitle;
      setDisplayTitle(conversationTitle);
    }
  }, [conversationTitle]);

  useEffect(() => {
    if (!conversationTitle && instanceTitle) {
      setDisplayTitle(instanceTitle);
    }
  }, [instanceTitle, conversationTitle]);

  return displayTitle;
}


export function AgentFloatingChat({
  instanceId,
  onClose,
}: AgentFloatingChatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const displayTitle = useAnimatedTitle(instanceId);

  // We use our centralized url-sync hook instead of manual slots
  useUrlSync("agent", instanceId, { m: "fc" });

  const handleClose = () => {
    onClose();
  };

  return (
    <WindowPanel
      title={displayTitle}
      onClose={handleClose}
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
