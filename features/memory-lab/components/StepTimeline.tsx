"use client";

/**
 * Memory Lab — the step timeline. Each step: who ran (role + agent), its outcome, every edit with
 * its why, evidence and per-file diff (before → after), the agent's questions, and its doors: the
 * provision snapshot(s), the run conversation, and Watch AI.
 */
import { useState } from "react";
import { Eye, FileDiff, ScanSearch } from "lucide-react";

import { DiffViewer } from "@ai-matrx/diff/react";
import { RecordId } from "@ai-matrx/design-system";
import { Badge, Button, EmptyState, PropertyRow } from "@ai-matrx/design-system/controls";
import { useOpenProvisionWindow } from "@/features/overlays/definitions/provisionWindow.overlay";
import { useWatchAiRun } from "@/features/overlays/definitions/aiWatchWindow.overlay";
import { ROLE_LABEL, type LabAgent, type MemoryEdit, type MemoryEditResult, type MemoryTrialStep } from "../types";

export const STATUS_TONE = { applied: "success", nothing: "neutral", failed: "destructive" } as const;
export const STATUS_LABEL = { applied: "Applied", nothing: "Nothing to add", failed: "Failed" } as const;

function EditRow({ edit, result, index }: { edit: MemoryEdit; result: MemoryEditResult | undefined; index: number }) {
  const [open, setOpen] = useState(false);
  const changed = result && result.before !== result.after;
  return (
    <li className="flex flex-col gap-1 border-t border-border py-2 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{edit.command || "edit"}</Badge>
        <span className="type-body min-w-0 truncate font-mono text-foreground">{edit.path || "No path"}</span>
        {result ? (
          result.ok ? (
            <Badge tone="success">Done</Badge>
          ) : (
            <Badge tone="destructive" title={result.error ?? undefined}>
              Refused
            </Badge>
          )
        ) : (
          <Badge tone="warning">No result</Badge>
        )}
        {changed ? (
          <Button variant="quiet" icon={<FileDiff />} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide diff" : "Diff"}
          </Button>
        ) : null}
      </div>
      {edit.why ? <span className="type-caption text-muted-foreground">{edit.why}</span> : null}
      {result && !result.ok && result.error ? (
        <span className="type-caption text-destructive">{result.error}</span>
      ) : null}
      {edit.evidence.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {edit.evidence.map((e, i) => (
            <li key={`${index}-${i}`} className="type-caption text-muted-foreground">
              {e.position !== null ? `#${e.position} ` : ""}“{e.quote}”
            </li>
          ))}
        </ul>
      ) : null}
      {open && result ? (
        <DiffViewer
          original={result.before ?? ""}
          modified={result.after ?? ""}
          engine="light"
          language="markdown"
          view="inline"
          originalLabel="Before"
          modifiedLabel="After"
        />
      ) : null}
    </li>
  );
}

export function StepCard({
  step,
  agent,
  conversationTitle,
}: {
  step: MemoryTrialStep;
  agent: LabAgent | undefined;
  conversationTitle: string | null;
}) {
  const openProvision = useOpenProvisionWindow();
  const watchAiRun = useWatchAiRun();
  const resultAt = (i: number) => step.results.find((r) => r.index === i);
  return (
    <article className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <header className="flex flex-wrap items-center gap-2">
        <span className="type-label text-foreground">
          {step.seq}. {ROLE_LABEL[step.role]}
        </span>
        <Badge tone={STATUS_TONE[step.status]}>{STATUS_LABEL[step.status]}</Badge>
        <span className="type-caption text-muted-foreground">{new Date(step.createdAt).toLocaleString()}</span>
        <span className="flex-1" />
        {step.provisionSnapshotIds.map((id, i) => (
          <Button
            key={id}
            variant="quiet"
            icon={<ScanSearch />}
            onClick={() => openProvision(id, `Step ${step.seq} provision`)}
          >
            {step.provisionSnapshotIds.length > 1 ? `Provision ${i + 1}` : "Provision"}
          </Button>
        ))}
        {step.runConversationId ? (
          <Button
            variant="quiet"
            icon={<Eye />}
            onClick={() => watchAiRun({ conversationId: step.runConversationId, label: `Step ${step.seq}` })}
          >
            Watch AI
          </Button>
        ) : null}
      </header>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
        <PropertyRow label="Agent">
          {step.agentId ? (
            <RecordId value={step.agentId} label={agent?.name ?? "Agent"} token="agent" labelled />
          ) : undefined}
        </PropertyRow>
        <PropertyRow label="Run">
          {step.runConversationId ? (
            <RecordId value={step.runConversationId} label="Run conversation" token="conversation" />
          ) : undefined}
        </PropertyRow>
        {step.subjectConversationId ? (
          <PropertyRow label="Reviewed">
            <RecordId
              value={step.subjectConversationId}
              label={conversationTitle ?? "Conversation"}
              token="conversation"
              labelled
            />
          </PropertyRow>
        ) : null}
      </div>
      {step.requestText ? <PropertyRow label="Asked" value={step.requestText} /> : null}
      {step.error ? <span className="type-caption text-destructive">{step.error}</span> : null}
      {step.nothingBecause ? (
        <PropertyRow label="Nothing to remember because" value={step.nothingBecause} />
      ) : null}
      {step.edits.length > 0 ? (
        <ul className="flex flex-col">
          {step.edits.map((edit, i) => (
            <EditRow key={i} edit={edit} result={resultAt(i)} index={i} />
          ))}
        </ul>
      ) : null}
      {step.questions.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="type-label text-muted-foreground">Questions</span>
          {step.questions.map((q, i) => (
            <span key={i} className="type-body text-foreground">
              {q.question}
              {q.path ? <span className="type-caption text-muted-foreground"> · {q.path}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function StepTimeline({
  steps,
  agents,
  conversationTitles,
}: {
  steps: MemoryTrialStep[];
  agents: Map<string, LabAgent>;
  conversationTitles: Map<string, string | null>;
}) {
  if (steps.length === 0) {
    return (
      <EmptyState
        icon={<FileDiff />}
        title="No steps yet"
        line="Review a conversation to start the store."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {[...steps].reverse().map((step) => (
        <StepCard
          key={step.id}
          step={step}
          agent={step.agentId ? agents.get(step.agentId) : undefined}
          conversationTitle={
            step.subjectConversationId ? (conversationTitles.get(step.subjectConversationId) ?? null) : null
          }
        />
      ))}
    </div>
  );
}
