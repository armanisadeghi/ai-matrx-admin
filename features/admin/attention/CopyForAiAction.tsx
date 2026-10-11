"use client";

/**
 * A LABELED "Copy for AI" button (harsh walk 2026-10-10: the payload hid inside the "Copy,
 * transform or export" menu beside unlabeled icons). It builds the payload when pressed — so it can
 * read the record's occurrences — and writes it through the app's one plain-copy door
 * (`copyToClipboard`, kit `copyText`) as the Alchemy agent envelope (`buildAgentPayload`).
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { buildAgentPayload, type AgentPayloadInput } from "@/components/agent-copy/buildAgentPayload";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { toast } from "@/lib/toast";

export function CopyForAiAction({ label, agent }: { label: string; agent: () => AgentPayloadInput | Promise<AgentPayloadInput> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      aria-label={`Copy ${label} for AI`}
      data-testid="copy-for-ai"
      onClick={async () => {
        setBusy(true);
        try {
          await copyToClipboard(buildAgentPayload(await agent()), `${label} copied for AI`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      Copy for AI
    </Button>
  );
}
