"use client";

/**
 * Mandates tab — the REAL mandates this surface names (by mandate key, or by a provision
 * point they consume; `mandate.definition`), each opening in place in the Mandate window,
 * then the PROPOSED mandate shapes (`mandate.proposal`), clearly marked.
 */

import { useEffect, useState } from "react";
import { Badge, Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { useOpenMandateWindow } from "@/features/overlays/openers/mandateWindow";
import { dbAuthoredMandateKey } from "@ai-matrx/agents/mandates";
import { fetchSurfaceMandates, type MandateProposal, type RealMandate } from "../data";
import { ProposalCard } from "./ProposalCard";

export function BuilderMandatesTab({
  surfaceKey,
  mandateKeys,
  provisionKeys,
  proposals,
  proposalsError,
}: {
  surfaceKey: string;
  mandateKeys: string[];
  provisionKeys: string[];
  proposals: MandateProposal[] | null;
  proposalsError: string | null;
}) {
  const [real, setReal] = useState<RealMandate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openMandate = useOpenMandateWindow();
  const keySig = `${mandateKeys.join(",")}|${provisionKeys.join(",")}`;

  useEffect(() => {
    let live = true;
    setReal(null);
    setError(null);
    const [mk, pk] = keySig.split("|").map((part) => part.split(",").filter(Boolean));
    fetchSurfaceMandates(mk ?? [], pk ?? [])
      .then((rows) => live && setReal(rows))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [keySig]);

  const shapes = proposals ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bound to this page</h3>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {real === null && !error ? <RegionSkeleton shape="rows" count={2} /> : null}
        {real && !real.length ? (
          <p className="text-xs text-muted-foreground">
            {mandateKeys.length || provisionKeys.length ? "None built yet" : "This page names no mandate"}
          </p>
        ) : null}
        {real?.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <span className="text-sm font-medium">{m.label}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{m.mandateKey}</span>
            {m.isEnabled ? null : <Badge tone="warning">Off</Badge>}
            <Button
              variant="quiet"
              className="ml-auto"
              onClick={() =>
                openMandate({
                  initialMandateKey: dbAuthoredMandateKey(m.mandateKey),
                  mandateKeys: [dbAuthoredMandateKey(m.mandateKey)],
                  surfaceName: surfaceKey,
                })
              }
            >
              Open
            </Button>
          </div>
        ))}
        {provisionKeys.length ? (
          <p className="text-[11px] text-muted-foreground">Provision points: {provisionKeys.join(", ")}</p>
        ) : null}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed</h3>
        {proposalsError ? <p className="text-xs text-destructive">{proposalsError}</p> : null}
        {proposals === null && !proposalsError ? <RegionSkeleton shape="cards" count={1} /> : null}
        {proposals && !shapes.length ? <p className="text-xs text-muted-foreground">No proposal</p> : null}
        {shapes.map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      </section>
    </div>
  );
}
