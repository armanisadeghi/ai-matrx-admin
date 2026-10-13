"use client";

/**
 * One row of the run story on one screen: Sent (the exact request), Received (the exact raw
 * response) and What we took from it (the derived values from that step, each with the place in
 * the raw response it came from when it can be found there). Nothing is reshaped.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { msText } from "../requests";
import { derivedFor, findInResponse, type StoryRow } from "../story";
import type { BuilderEntry } from "../types";
import type { RunRow } from "../data";
import { BuilderJson } from "./BuilderJson";
import { storyIcon } from "./BuilderStorySidebar";

const PANE = "h-72 shrink-0";

function Section({ title, count, children }: { title: string; count?: number | null; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
        {title}
        {count ? <span className="font-normal tabular-nums text-muted-foreground">{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function BuilderStoryDetail({
  row,
  entries,
  run,
  onOpenEntry,
  onOpenStep,
  onOpenSnapshot,
}: {
  row: StoryRow;
  entries: BuilderEntry[];
  run: RunRow | null;
  onOpenEntry: (key: string) => void;
  onOpenStep: (runId: string, nodeId: string | null) => void;
  onOpenSnapshot: (id: string) => void;
}) {
  const { format } = useCostDisplay();
  const [showRecord, setShowRecord] = useState(false);
  const Icon = storyIcon(row.icon);
  const derived = derivedFor(row, entries);
  const out = record(row.outcome?.output);
  const snapshotId = typeof out.snapshot_id === "string" ? out.snapshot_id : null;
  const multi = row.calls.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-3 py-1.5">
        {row.number ? <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.number}</span> : null}
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
        <h2 className="min-w-0 truncate text-sm font-semibold">{row.title}</h2>
        {row.status ? (
          <Badge tone={row.status === "done" ? "success" : row.status === "failed" ? "destructive" : row.status === "running" ? "info" : "neutral"}>
            {row.status}
          </Badge>
        ) : null}
        {row.ms !== null ? <span className="text-[11px] tabular-nums text-muted-foreground">{msText(row.ms)}</span> : null}
        {row.costUsd ? <span className="text-[11px] tabular-nums text-muted-foreground">{format(row.costUsd)}</span> : null}
        <span className="ml-auto flex items-center gap-1">
          {row.runId && row.kind !== "run" ? (
            <Button variant="quiet" onClick={() => onOpenStep(row.runId as string, row.nodeId)}>
              Step in Workflow
            </Button>
          ) : null}
          {snapshotId ? (
            <Button variant="quiet" onClick={() => onOpenSnapshot(snapshotId)}>
              Open snapshot
            </Button>
          ) : null}
          {row.kind === "run" && row.runId ? (
            <Button variant="quiet" asChild icon={<ExternalLink className="h-3.5 w-3.5" />}>
              <OutboundLink href={runHref(row.runId)}>Open run</OutboundLink>
            </Button>
          ) : null}
        </span>
      </div>
      {row.reason || row.detail ? (
        <p className="shrink-0 truncate px-3 pt-1.5 font-mono text-[11px] text-muted-foreground" title={row.reason ?? row.detail ?? undefined}>
          {row.reason ?? row.detail}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 p-3">
        {row.kind === "inputs" || row.kind === "record" ? (
          <Section title={row.kind === "inputs" ? "Typed and picked" : "Saved"} count={row.entries.length}>
            {row.entries.length ? (
              row.entries.map((e) => (
                <BuilderJson key={e.key} data={e.data} label={e.label} location={`Run · ${e.label}`} className="h-40 shrink-0" />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Nothing typed yet</p>
            )}
          </Section>
        ) : null}

        {row.kind === "run" ? (
          <>
            <Section title="Sent">
              <BuilderJson data={run?.input ?? null} label="Run input" location={`Run · ${row.title} · input`} className={PANE} />
            </Section>
            <Section title="Received">
              <BuilderJson data={run} label="Run record" location={`Run · ${row.title} · record`} className="h-48 shrink-0" />
            </Section>
          </>
        ) : null}

        {row.kind === "step" || row.kind === "call" ? (
          <>
            <Section title="Sent" count={multi ? row.calls.length : null}>
              {row.calls.length ? (
                row.calls.map((c) => (
                  <BuilderJson key={c.id} data={c.request} label={multi ? c.title : "Request"} location={`Run · ${c.title} · request`} className={multi ? "h-32 shrink-0" : "h-44 shrink-0"} />
                ))
              ) : row.outcome ? (
                <BuilderJson data={row.outcome.input} label="Step input" location={`Run · ${row.title} · input`} className="h-48 shrink-0" />
              ) : (
                <p className="text-xs text-muted-foreground">No record of this step in the run</p>
              )}
            </Section>
            <Section title="Received" count={multi ? row.calls.length : null}>
              {row.calls.length ? (
                row.calls.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5">
                    {c.error ? <p className="text-xs text-destructive">{c.error}</p> : null}
                    <BuilderJson data={c.response} label={multi ? c.title : "Response"} location={`Run · ${c.title} · response`} className={PANE} />
                  </div>
                ))
              ) : row.outcome ? (
                <BuilderJson data={row.outcome.output} label="Step output" location={`Run · ${row.title} · output`} className={PANE} />
              ) : null}
              {row.outcome?.error ? (
                <BuilderJson data={row.outcome.error} label="Error" location={`Run · ${row.title} · error`} className="h-40 shrink-0" />
              ) : null}
            </Section>
            <Section title="What we took from it" count={derived.length}>
              {derived.length ? (
                <ul className="flex flex-col rounded-md border border-border">
                  {derived.map((e) => {
                    const path = row.calls.map((c) => ({ c, p: findInResponse(c.response, e) })).find((x) => x.p);
                    const where = record(record(e.data).source).where;
                    const certainty = typeof e.certainty === "number" ? Math.round(e.certainty * 100) : null;
                    return (
                      <li key={e.key} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          data-clickable
                          onClick={() => onOpenEntry(e.key)}
                          className="flex w-full min-w-0 flex-col items-start px-2 py-1 text-left hover:bg-accent/60"
                        >
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="truncate text-xs font-medium">{e.label}</span>
                            {certainty !== null ? <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{certainty}%</span> : null}
                          </span>
                          <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
                            {path
                              ? `${multi ? `${path.c.title} → ` : ""}${path.p}`
                              : typeof where === "string"
                                ? where
                                : "not found in this response"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nothing taken from this step</p>
              )}
            </Section>
            {row.outcome && row.calls.length ? (
              <section className="flex flex-col gap-1.5">
                <button
                  type="button"
                  data-clickable
                  onClick={() => setShowRecord((s) => !s)}
                  className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
                >
                  {showRecord ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Step input and output
                </button>
                {showRecord ? (
                  <>
                    <BuilderJson data={row.outcome.input} label="Step input" location={`Run · ${row.title} · input`} className="h-48 shrink-0" />
                    <BuilderJson data={row.outcome.output} label="Step output" location={`Run · ${row.title} · output`} className={PANE} />
                  </>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
