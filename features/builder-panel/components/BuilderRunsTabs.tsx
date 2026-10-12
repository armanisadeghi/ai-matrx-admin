"use client";

/**
 * AI calls tab — every AI run this page published (and every workflow run, whose AI steps the
 * Watch AI window collects), each opening in the Watch AI window (`useWatchAiRun`).
 * Provision tab — the provision snapshots this page captured, shown with the canonical
 * Provision body (`ProvisionWindowBody`), plus the door to the Provision window.
 */

import { useState } from "react";
import { Eye, PanelTopOpen } from "lucide-react";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { Button, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useWatchAiRun } from "@/features/overlays/openers/aiWatchWindow";
import { useOpenProvisionWindow } from "@/features/overlays/openers/provisionWindow";
import { ProvisionWindowBody } from "@/features/provision-window/ProvisionWindowBody";
import type { BuilderEntry, BuilderRef } from "../types";

type AiRef = Extract<BuilderRef, { type: "ai_run" }>;

export function BuilderAiTab({
  aiRuns,
  workflowRuns,
}: {
  aiRuns: { entry: BuilderEntry; ref: AiRef }[];
  workflowRuns: { entry: BuilderEntry; runId: string; label: string }[];
}) {
  const watch = useWatchAiRun();
  if (!aiRuns.length && !workflowRuns.length) {
    return <p className="p-3 text-xs text-muted-foreground">No AI call on this page yet</p>;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
      <ul className="rounded-md border border-border">
        {aiRuns.map(({ entry, ref }) => (
          <li key={entry.key} className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
            <span className="truncate text-xs font-medium">{entry.label}</span>
            <span className="text-[11px] text-muted-foreground">{formatRelativeTime(entry.at)}</span>
            <Button
              variant="quiet"
              className="ml-auto"
              icon={<Eye className="h-3.5 w-3.5" />}
              onClick={() =>
                watch({
                  requestId: ref.requestId ?? null,
                  userRequestId: ref.userRequestId ?? null,
                  workflowRunId: ref.workflowRunId ?? null,
                  conversationId: ref.conversationId ?? null,
                  label: entry.label,
                })
              }
            >
              Watch
            </Button>
          </li>
        ))}
        {workflowRuns.map(({ entry, runId, label }) => (
          <li key={`wf:${runId}`} className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
            <span className="truncate text-xs font-medium">{label}</span>
            <span className="text-[11px] text-muted-foreground">AI steps · {formatRelativeTime(entry.at)}</span>
            <Button
              variant="quiet"
              className="ml-auto"
              icon={<Eye className="h-3.5 w-3.5" />}
              onClick={() => watch({ workflowRunId: runId, label })}
            >
              Watch
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BuilderProvisionTab({ snapshots }: { snapshots: { entry: BuilderEntry; id: string }[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const openProvision = useOpenProvisionWindow();
  const ordered = [...snapshots].sort((a, b) => b.entry.at - a.entry.at);
  const current = ordered.find((s) => s.id === picked) ?? ordered[0] ?? null;
  if (!current) return <p className="p-3 text-xs text-muted-foreground">No provision snapshot on this page yet</p>;
  const options: SelectOption<string>[] = ordered.map((s) => ({
    value: s.id,
    label: `${s.entry.label} · ${formatRelativeTime(s.entry.at)}`,
  }));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Select aria-label="Snapshot" value={current.id} onValueChange={setPicked} options={options} />
        <Button
          variant="quiet"
          className="ml-auto"
          icon={<PanelTopOpen className="h-3.5 w-3.5" />}
          onClick={() => openProvision(current.id, current.entry.label)}
        >
          Open window
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ProvisionWindowBody key={current.id} snapshotId={current.id} />
      </div>
    </div>
  );
}
