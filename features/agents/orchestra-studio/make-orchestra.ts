"use client";

import { useCallback, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useCreateConductor } from "@/features/agents/orchestras/conductor/useCreateConductor";
import { syncConductorPrompt } from "@/features/agents/orchestras/conductor/thunks";
import { addAgentToOrchestra } from "@/features/agents/redux/orchestras/thunks";
import { DEFAULT_ORCHESTRA_ACCENT } from "@/features/agents/orchestras/constants";
import { membersFromPlan } from "./plan-progress";
import type { SystemPlan } from "./types";

export interface MadeOrchestra {
  conductorId: string;
  /** Steps that did not finish; the Orchestra exists regardless. */
  warnings: string[];
}

/**
 * "Turn into an Orchestra": composes the existing Orchestra primitives only —
 * `useCreateConductor` (template copy + name + marker), `addAgentToOrchestra` (each step's agent,
 * its step as role), `syncConductorPrompt` (the Conductor learns its team; streams in the live run window).
 * No second ensemble system.
 */
export function useMakeOrchestra() {
  const dispatch = useAppDispatch();
  const { create, error: createError } = useCreateConductor();
  const [step, setStep] = useState<string | null>(null);

  const make = useCallback(
    async (plan: SystemPlan): Promise<MadeOrchestra | { error: string }> => {
      const members = membersFromPlan(plan);
      if (members.length === 0) return { error: "No step has an agent yet." };
      setStep("Creating the Conductor…");
      const conductorId = await create({
        name: plan.title.slice(0, 80),
        accent: DEFAULT_ORCHESTRA_ACCENT,
        tagline: plan.recommendation?.slice(0, 160) ?? undefined,
      });
      if (!conductorId) {
        setStep(null);
        return { error: createError ?? "The Conductor could not be created." };
      }
      const warnings: string[] = [];
      setStep(`Adding ${members.length} ${members.length === 1 ? "agent" : "agents"}…`);
      for (const m of members) {
        const res = await dispatch(addAgentToOrchestra({ conductorId, agentId: m.agentId, meta: { roleTitle: m.roleTitle, gap: m.gap } }));
        if (!res.ok) warnings.push(res.error ?? "An agent could not be added.");
      }
      setStep("Teaching the Conductor its team…");
      const sync = await dispatch(
        syncConductorPrompt({ initiation: "user", conductorId, memberIds: members.map((m) => m.agentId) }),
      );
      if (!sync.ok) warnings.push(`Its prompt still needs its team: ${sync.error ?? "sync failed"}. Use Sync agent listings in the Orchestra.`);
      setStep(null);
      return { conductorId, warnings };
    },
    [create, createError, dispatch],
  );

  return { make, step };
}
