"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectNeedsPreExecutionInput } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { openAgentGateWindow } from "@/lib/redux/slices/overlaySlice";

interface ExecutionManagerProps {
  conversationId: string;
}

export function ExecutionManager({ conversationId }: ExecutionManagerProps) {
  const dispatch = useAppDispatch();
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(conversationId),
  );

  // Stable window conversationId — one gate window per agent instance.
  // Using a ref so it never changes across re-renders.
  const gateWindowId = useRef(`gate-${conversationId}`).current;

  // When pre-execution input is needed, open the gate window via Redux.
  // When it's no longer needed (user continued or cancelled), nothing to clean up
  // since the gate window closes itself on continue/cancel.
  useEffect(() => {
    if (!needsPreExecution) return;
    dispatch(
      openAgentGateWindow({
        conversationId: conversationId,
        gateWindowId: gateWindowId,
      }),
    );
  }, [needsPreExecution, gateWindowId, conversationId, dispatch]);

  // While waiting for pre-execution, don't render the chat window yet.
  if (needsPreExecution) return null;

  return null;
}
