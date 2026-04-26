"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateAgentAppForm } from "@/features/agent-apps/components/CreateAgentAppForm";
import type { AgentOption } from "@/features/agent-apps/components/SearchableAgentSelect";
import type { CreateAgentAppInput } from "@/features/agent-apps/types";

interface NewAgentAppClientProps {
  agents: AgentOption[];
  preselectedAgentId: string | null;
  currentUserId: string | null;
}

export function NewAgentAppClient({
  agents,
  preselectedAgentId,
}: NewAgentAppClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(
    async (input: CreateAgentAppInput) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/agent-apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            body?.error ?? `Create failed (HTTP ${res.status})`;
          throw new Error(msg);
        }

        const created = (await res.json()) as { id: string };
        router.push(`/agent-apps/${created.id}`);
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return (
    <CreateAgentAppForm
      agents={agents}
      onSubmit={onSubmit}
      onCancel={() => router.push("/agent-apps")}
      busy={busy}
      defaultAgentId={preselectedAgentId}
    />
  );
}
