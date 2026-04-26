"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AgentAppEditor } from "@/features/agent-apps/components/AgentAppEditor";
import type { AgentApp, UpdateAgentAppInput } from "@/features/agent-apps/types";

interface AgentAppEditPageClientProps {
  app: AgentApp;
}

export function AgentAppEditPageClient({ app }: AgentAppEditPageClientProps) {
  const router = useRouter();

  const onSave = useCallback(
    async (id: string, input: UpdateAgentAppInput) => {
      const res = await fetch(`/api/agent-apps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Save failed (HTTP ${res.status}): ${body || "unknown"}`);
      }

      router.refresh();
    },
    [router],
  );

  return <AgentAppEditor app={app} onSave={onSave} />;
}
