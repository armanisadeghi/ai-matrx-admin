"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectModeState } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { updateModeState } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";

const HEARTBEAT_STEPS = [0, 15, 30, 60, 120, 300];

export function useAssistantHeartbeat(instanceId: string) {
  const dispatch = useAppDispatch();
  const modeState = useAppSelector(selectModeState(instanceId));
  const heartbeatInterval = (modeState?.heartbeatInterval as number) ?? 0;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (heartbeatInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      // Skeleton: heartbeat fires but does nothing yet.
      // Future: dispatch context push or trigger execution here.
    }, heartbeatInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [heartbeatInterval]);

  const setHeartbeatInterval = (seconds: number) => {
    dispatch(
      updateModeState({
        instanceId,
        changes: { heartbeatInterval: seconds },
      }),
    );
  };

  const increaseHeartbeat = () => {
    const currentIdx = HEARTBEAT_STEPS.indexOf(heartbeatInterval);
    const nextIdx = Math.min(
      currentIdx < 0 ? 1 : currentIdx + 1,
      HEARTBEAT_STEPS.length - 1,
    );
    setHeartbeatInterval(HEARTBEAT_STEPS[nextIdx]);
  };

  const decreaseHeartbeat = () => {
    const currentIdx = HEARTBEAT_STEPS.indexOf(heartbeatInterval);
    const nextIdx = Math.max(currentIdx < 0 ? 0 : currentIdx - 1, 0);
    setHeartbeatInterval(HEARTBEAT_STEPS[nextIdx]);
  };

  const triggerHeartbeat = () => {
    // Skeleton: manual trigger. Wire real logic later.
  };

  return {
    heartbeatInterval,
    setHeartbeatInterval,
    increaseHeartbeat,
    decreaseHeartbeat,
    triggerHeartbeat,
  };
}
