"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { recreateManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { PlusTapButton } from "@/components/icons/tap-buttons";
import { selectAgentName } from "@/features/agents/redux/agent-definition/selectors";

interface AgentNewRunButtonProps {
  agentId: string;
  conversationId: string;
  surfaceKey: string;
}

/**
 * Self-contained "new run" button.
 * Derives surfaceKey from agentId, reads the focused conversationId from Redux,
 * and clears the URL ?conversationId param — no props needed from the parent.
 */
export function AgentNewRunButton({
  agentId,
  conversationId,
  surfaceKey,
}: AgentNewRunButtonProps) {
  const agentName = useAppSelector((state) => selectAgentName(state, agentId));
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleNewRun = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("conversationId");
    router.replace(`${pathname}?${params.toString()}`);

    dispatch(
      recreateManualInstance({
        currentConversationId: conversationId,
        surfaceKey,
      }),
    )
      .unwrap()
      .catch((err) => console.error("Failed to create new run:", err));
  }, [conversationId, surfaceKey, dispatch, pathname, router, searchParams]);

  return <PlusTapButton onClick={handleNewRun} />;
}
