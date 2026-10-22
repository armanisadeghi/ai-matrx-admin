"use client";

// features/mandates/components/ProvisionValueGroups.tsx
//
// THE PROVISION AS IT REALLY IS — every offered value in its package (the `group` its declaration names), with what
// the latest proof run found: the verdict, a real sample, the exact shape, and when the value exists at all.
// Rendered by `ProvisionOfferList` whenever a provision declares packages or carries a proof.
//
// Arman, 2026-10-21 (mandates VISION § A provision is real, and the mandate proves it): "when you look at the
// mandate, we know the reality of what we are going to get, the exact shape of the data and more." A value no proof
// covered says "Not proven" — never an invented example.

import { useState } from "react";
import {
  Badge,
  Button,
  ConfigurationTable,
  ConfigurationTableRow,
  FieldHelp,
  PropertyRow,
} from "@ai-matrx/design-system/controls";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { displayLabel, humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { KIND_KEY } from "@ai-matrx/content-ir";
import type { OfferedValue } from "../provision-shapes";
import {
  sourceWords,
  VERDICT_TONE,
  VERDICT_WORDS,
  type ProofValue,
  type ProofVerdict,
  type ProvisionProof,
  type ValuePlacement,
} from "../provision-proof";

const OTHER = "Other";

const COLUMNS = [
  { key: "name", label: "Value" },
  { key: "proof", label: "Proof" },
  { key: "when", label: "When there" },
  { key: "shape", label: "Shape" },
  { key: "sample", label: "Sample" },
] as const;

type Row = Partial<OfferedValue> & { label?: string };

function shapeText(shape: unknown): string {
  if (shape === null || shape === undefined) return "";
  if (typeof shape === "string") return shape;
  if (Array.isArray(shape)) return `list of ${shapeText(shape[0]) || "items"}`;
  if (typeof shape === "object") {
    return Object.entries(shape as Record<string, unknown>)
      .filter(([k]) => k !== KIND_KEY)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : "object"}`)
      .join(", ");
  }
  return String(shape);
}

function sampleText(sample: unknown): string {
  if (sample === null || sample === undefined) return "";
  return typeof sample === "string" ? sample : JSON.stringify(sample, null, 1);
}

function SampleCell({ proof }: { proof: ProofValue | undefined }) {
  const [open, setOpen] = useState(false);
  const text = sampleText(proof?.sample);
  if (!text) return <span className="text-muted-foreground">None</span>;
  const line = text.replace(/\s+/g, " ").slice(0, 80);
  return (
    <div className="min-w-0 max-w-md">
      <div className="flex items-center gap-1">
        <span className="truncate font-mono text-xs">{line}</span>
        <Button variant="quiet" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Open"}
        </Button>
      </div>
      {open ? (
        <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-muted p-2 font-mono text-xs">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

function verdictOf(name: string | undefined, proof: ProvisionProof | null): ProofVerdict | "unproven" {
  return (name && proof?.values[name]?.verdict) || "unproven";
}

export function ProvisionValueGroups({
  values,
  proof,
  placements,
}: {
  values: readonly Row[];
  proof: ProvisionProof | null;
  placements: Record<string, ValuePlacement>;
}) {
  const groups = new Map<string, Row[]>();
  for (const value of values) {
    const name = value.name || "";
    const group = placements[name]?.group || proof?.values[name]?.group || OTHER;
    groups.set(group, [...(groups.get(group) ?? []), value]);
  }
  const counts = proof?.counts ?? {};
  return (
    <div className="min-w-0 space-y-2">
      <PropertyRow
        label="Proof"
        value={
          proof
            ? `${counts.seen ?? 0} real · ${counts.empty_in_proof ?? 0} empty · ${counts.not_produced ?? 0} not produced · ${counts.inconclusive ?? 0} retry`
            : "Not proven"
        }
      />
      {proof?.provedAt ? (
        <PropertyRow label="Proved" value={new Date(proof.provedAt).toLocaleString()} />
      ) : null}
      <Accordion type="multiple" size="sm">
        {[...groups.entries()].map(([group, rows]) => {
          const real = rows.filter((r) => verdictOf(r.name, proof) === "seen").length;
          return (
            <AccordionItem key={group} value={group}>
              <AccordionTrigger>
                <span>
                  <span className="font-semibold">{group}</span>
                  <span className="ml-2 text-muted-foreground">
                    {proof ? `${real} of ${rows.length} real` : `${rows.length}`}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ConfigurationTable label={`${group} values`} columns={COLUMNS}>
                  {rows.map((value, index) => {
                    const name = value.name || "";
                    const found = proof?.values[name];
                    const verdict = verdictOf(name, proof);
                    const title = displayLabel(
                      value.label?.trim() === name ? undefined : value.label,
                      name,
                    );
                    return (
                      <ConfigurationTableRow
                        key={`${name}:${index}`}
                        columns={COLUMNS}
                        cells={{
                          name: (
                            <span className="inline-flex items-center gap-1 font-semibold">
                              {title || name}
                              <FieldHelp label={title || name}>
                                {[value.description, value.kind ? humanizeIdentifier(value.kind) : ""]
                                  .filter(Boolean)
                                  .join(" · ") || name}
                              </FieldHelp>
                            </span>
                          ),
                          proof: <Badge tone={VERDICT_TONE[verdict]}>{VERDICT_WORDS[verdict]}</Badge>,
                          when: sourceWords(placements[name]?.source ?? found?.source ?? null),
                          shape: (
                            <span className="font-mono text-xs">{shapeText(found?.shape) || "—"}</span>
                          ),
                          sample: <SampleCell proof={found} />,
                        }}
                      />
                    );
                  })}
                </ConfigurationTable>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {proof && proof.undeclared.length > 0 ? (
        <PropertyRow
          label="Fetched, not offered"
          value={[...new Set(proof.undeclared.map((u) => u.what))].join(", ")}
        />
      ) : null}
    </div>
  );
}
