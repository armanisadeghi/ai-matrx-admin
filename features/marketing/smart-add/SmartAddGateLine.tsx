"use client";

/**
 * Smart Add — one short line when the brand's homepage is only a door to its real site
 * ("Their site splits into 3 areas" + the area names). The detection, its signals and the
 * per-branch findings are on the page step's output (aidream brand_identify_gate.py) and reach
 * the admin Builder panel through the round's steps; here the customer sees just the areas.
 */

import type { RoundView, SiteGate } from "./SmartAddRound";

const LINE: Partial<Record<SiteGate["type"], string>> = {
  division_chooser: "Their site splits into",
  language_gate: "Their site comes in",
};

export function SmartAddGateLine({ views }: { views: RoundView[] }) {
  const gate = views.flatMap((v) => v.steps.map((s) => s.gate ?? null)).find((g) => g && LINE[g.type] && g.branches.length > 1);
  if (!gate) return null;
  const n = gate.branches.length;
  const noun = gate.type === "division_chooser" ? `${n} areas` : `${n} versions`;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" data-testid="smart-add-gate-line" data-gate={gate.type}>
      <span>{`${LINE[gate.type]} ${noun}`}</span>
      {gate.branches.map((b) => (
        <span key={b.url} className="rounded-full border border-border px-2 py-px text-foreground/80" title={b.url}>
          {b.label}
        </span>
      ))}
    </div>
  );
}
