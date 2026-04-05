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
 *   - Fully self-contained — receives only instanceId + onClose.
 *   - Renders AgentRunner inside for full execution lifecycle.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";

interface AgentFloatingChatProps {
  instanceId: string;
  onClose: () => void;
}

export function AgentFloatingChat({
  instanceId,
  onClose,
}: AgentFloatingChatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const agentName = useAppSelector(selectInstanceAgentName(instanceId));
  const conversationTitle = useAppSelector(
    selectConversationTitle(instanceId),
  );
  const conversationId = useAppSelector(
    selectStoredConversationId(instanceId),
  );
  const instanceTitle = useAppSelector(selectInstanceTitle(instanceId));

  // ── Title animation ────────────────────────────────────────────────────────
  const [displayTitle, setDisplayTitle] = useState(
    instanceTitle ?? agentName ?? "Agent",
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const prevConversationTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      conversationTitle &&
      conversationTitle !== prevConversationTitleRef.current
    ) {
      prevConversationTitleRef.current = conversationTitle;
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayTitle(conversationTitle);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [conversationTitle]);

  useEffect(() => {
    if (!conversationTitle && instanceTitle) {
      setDisplayTitle(instanceTitle);
    }
  }, [instanceTitle, conversationTitle]);

  // ── URL params (write-only for now) ────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.get("rci") !== conversationId) {
      params.set("rci", conversationId);
      changed = true;
    }
    if (params.get("rcd") !== "fc") {
      params.set("rcd", "fc");
      changed = true;
    }

    if (changed) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [conversationId, pathname, router, searchParams]);

  // Clean up URL params on close
  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("rcd");
    params.delete("rci");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    onClose();
  };

  return (
    <WindowPanel
      title=""
      onClose={handleClose}
      initialWidth={420}
      initialHeight={Math.round(window.innerHeight * 0.6)}
      minWidth={320}
      minHeight={280}
      bodyClassName="p-0"
      actionsLeft={
        <div className="relative overflow-hidden h-5 flex items-center min-w-0">
          <span
            className={cn(
              "text-xs font-medium text-foreground/80 truncate max-w-[240px] transition-all duration-300",
              isAnimating &&
                "translate-x-full opacity-0",
            )}
          >
            {displayTitle}
          </span>
        </div>
      }
    >
      <AgentRunner
        instanceId={instanceId}
        compact
        className="h-full"
      />
    </WindowPanel>
  );
}
