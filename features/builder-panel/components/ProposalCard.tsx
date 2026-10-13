"use client";

/** One PROPOSED shape (mandate or workflow) — marked as a proposal, never as a built job. */

import { Badge } from "@ai-matrx/design-system/controls";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import type { MandateProposal } from "../data";
import { BuilderJson } from "./BuilderJson";

interface Step {
  id: string;
  label: string;
  status: string;
}

function stepsOf(value: unknown): Step[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const r = s as Record<string, unknown>;
    return [{ id: String(r.id ?? ""), label: String(r.label ?? r.id ?? ""), status: String(r.status ?? "proposed") }];
  });
}

export function ProposalCard({ proposal }: { proposal: MandateProposal }) {
  const steps = stepsOf(proposal.steps);
  const inputs = Array.isArray(proposal.inputs) ? proposal.inputs : [];
  return (
    <article className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <header className="flex flex-wrap items-center gap-2">
        <Badge tone="warning">Proposed {proposal.shapeType}</Badge>
        <span className="text-sm font-semibold">{proposal.title}</span>
        {proposal.proposedKey ? <span className="font-mono text-[11px] text-muted-foreground">{proposal.proposedKey}</span> : null}
        <div className="ml-auto">
          <CopyButtons label={proposal.title} sourceId={`proposal:${proposal.id}`} json={() => proposal} />
        </div>
      </header>
      {proposal.goal ? <p className="text-xs">{proposal.goal}</p> : null}
      {steps.length ? (
        <ol className="flex flex-wrap items-center gap-1 text-[11px]">
          {steps.map((s, i) => (
            <li key={s.id || i} className="flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground">→</span> : null}
              <Badge tone={s.status === "built" ? "success" : "warning"}>{s.label}</Badge>
            </li>
          ))}
        </ol>
      ) : null}
      {inputs.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Inputs</span>
          <BuilderJson data={proposal.inputs} label="Inputs" location={`Proposal ${proposal.title} · inputs`} className="h-48" />
        </div>
      ) : null}
      {proposal.outputSketch ? (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Output{proposal.outputKind ? ` · ${proposal.outputKind}` : ""}
          </span>
          <BuilderJson data={proposal.outputSketch} label="Output sketch" location={`Proposal ${proposal.title} · output sketch`} className="h-48" />
        </div>
      ) : null}
    </article>
  );
}
