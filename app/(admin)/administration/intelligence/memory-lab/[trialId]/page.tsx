// Intelligence › Memory Lab › one trial: conversations, agents and bindings, steps, sandbox store.
"use client";

import { use } from "react";
import { TrialWorkspace } from "@/features/memory-lab/components/TrialWorkspace";

export default function MemoryLabTrialPage({ params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = use(params);
  return <TrialWorkspace trialId={trialId} />;
}
