"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectLiveAgents,
  selectAgentsSliceStatus,
} from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentsList } from "@/features/agents/redux/agent-definition/thunks";
import type { AgentDefinitionRecord } from "@/features/agents/types/agent-definition.types";

export interface UseAgentsResult {
  agents: AgentDefinitionRecord[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAgents(): UseAgentsResult {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(selectLiveAgents);
  const status = useAppSelector(selectAgentsSliceStatus);

  useEffect(() => {
    if (status === "idle") {
      void dispatch(fetchAgentsList());
    }
  }, [status, dispatch]);

  const loading = status === "loading";
  return useMemo(
    () => ({
      agents,
      loading,
      error: null,
      reload: () => {
        void dispatch(fetchAgentsList());
      },
    }),
    [agents, loading, dispatch],
  );
}
