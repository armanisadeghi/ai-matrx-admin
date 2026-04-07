"use client";

import { useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { upsertAgent } from "@/features/agents/redux/agent-definition/slice";
import type { AgentDefinition } from "@/features/agents/types/agent-definition.types";

export function VersionHydrator({ snapshot }: { snapshot: AgentDefinition }) {
  const dispatch = useAppDispatch();
  const hydrated = useRef(false);

  if (!hydrated.current) {
    dispatch(upsertAgent(snapshot));
    hydrated.current = true;
  }

  return null;
}
