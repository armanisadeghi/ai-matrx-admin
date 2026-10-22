"use client";

/**
 * The extra sources a kind's items can gather (companies: Google rating, LinkedIn, open jobs, social
 * following) — each an on/off switch showing exactly what it adds and what it costs, BEFORE anything
 * runs. The choice is shared with every quote and run of the kind (`../facet-choice`), and the quote
 * refreshes when it changes, so the total shown is the run billed.
 *
 * Champion: Google Flights' filter switches (each option says what it changes) and Versus.com's
 * "add properties" — one row per option, its effect and its price on the row.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SettingRow, Switch } from "@ai-matrx/design-system/controls";
import { CostDoor } from "@/components/cost/CostDoor";
import { formatDurationSeconds } from "@ai-matrx/kit/format";

import type { ComparisonKindInfo, FacetInfo } from "../contract";
import { facetChoice, onFacetChoice, setFacetChoice } from "../facet-choice";

export function facetsOn(kind: ComparisonKindInfo): string[] {
  return facetChoice(kind.key) ?? (kind.facets ?? []).filter((f) => f.default_on).map((f) => f.key);
}

export function FacetOptions({ kind, itemCount }: { kind: ComparisonKindInfo; itemCount: number }) {
  const facets = kind.facets ?? [];
  const queryClient = useQueryClient();
  const [on, setOn] = useState<string[]>(() => facetsOn(kind));
  useEffect(() => onFacetChoice(() => setOn(facetsOn(kind))), [kind]);
  if (!facets.length) return null;

  function toggle(f: FacetInfo, next: boolean) {
    const keys = facets.map((x) => x.key).filter((k) => (k === f.key ? next : on.includes(k)));
    setFacetChoice(kind.key, keys);
    void queryClient.invalidateQueries({ queryKey: ["comparison", "quote", kind.key] });
  }

  const n = Math.max(itemCount, 1);
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-2" aria-label="Also gather">
      <div className="type-label pb-1 pt-1">Also gather</div>
      {facets.map((f) => (
        <SettingRow
          key={f.key}
          htmlFor={`facet-${f.key}`}
          label={f.label}
          line={f.adds.join(" · ")}
        >
          <span className="type-secondary flex items-center gap-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
            <CostDoor points={f.points_per_item * n} prefix="+" iconOnly />
            {f.typical_seconds ? `~${formatDurationSeconds(f.typical_seconds, { style: "long", abbreviate: true, round: "nearest" })}` : ""}
          </span>
          <Switch id={`facet-${f.key}`} checked={on.includes(f.key)} onCheckedChange={(v) => toggle(f, v === true)}
            aria-label={`Gather ${f.label}`} />
        </SettingRow>
      ))}
    </section>
  );
}
