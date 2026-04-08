"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectNeedsPreExecutionInput } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { openAgentGateWindow } from "@/lib/redux/slices/overlaySlice";

interface ExecutionManagerProps {
  instanceId: string;
}

export function ExecutionManager({ instanceId }: ExecutionManagerProps) {
  const dispatch = useAppDispatch();
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );

  // Stable window instanceId — one gate window per agent instance.
  // Using a ref so it never changes across re-renders.
  const gateWindowId = useRef(`gate-${instanceId}`).current;

  // When pre-execution input is needed, open the gate window via Redux.
  // When it's no longer needed (user continued or cancelled), nothing to clean up
  // since the gate window closes itself on continue/cancel.
  useEffect(() => {
    if (!needsPreExecution) return;
    dispatch(
      openAgentGateWindow({
        instanceId: gateWindowId,
        agentInstanceId: instanceId,
      }),
    );
  }, [needsPreExecution, gateWindowId, instanceId, dispatch]);

  // While waiting for pre-execution, don't render the chat window yet.
  if (needsPreExecution) return null;

  return null;
}
