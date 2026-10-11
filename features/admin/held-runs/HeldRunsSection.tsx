"use client";

// The alarm record page's one mount: the runs this alarm stopped, each opening its held-run view.
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchHeldRunsForAlarm, heldRunHref, replayCostLine, type HeldRun } from "./heldRuns";
import { fetchMandateLabels } from "@/features/admin/spend-alarms/spendAlarms";

export function HeldRunsSection({ alarmId }: { alarmId: string }) {
  const [runs, setRuns] = useState<HeldRun[] | null>(null);
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    let live = true;
    fetchHeldRunsForAlarm(alarmId)
      .then(async (r) => {
        if (!live) return;
        setRuns(r);
        const l = await fetchMandateLabels(r.map((x) => x.mandate_key ?? "")).catch(() => new Map<string, string>());
        if (live) setLabels(l);
      })
      .catch(() => live && setRuns([]));
    return () => {
      live = false;
    };
  }, [alarmId]);
  if (!runs || runs.length === 0) return null;
  return (
    <section className="mb-4 rounded-md border border-border bg-card" data-testid="held-runs-section">
      <h2 className="border-b border-border px-3 py-2 text-sm font-medium">Stopped runs · {runs.length}</h2>
      <ul className="divide-y divide-border text-sm">
        {runs.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <Link className="font-medium underline" href={heldRunHref(r.id)}>
              {(r.mandate_key && labels.get(r.mandate_key)) ?? r.agent_name ?? r.mandate_key ?? "Held run"}
            </Link>
            {r.mandate_key && labels.get(r.mandate_key) ? <span className="text-xs text-muted-foreground">{r.mandate_key}</span> : null}
            <span className="text-muted-foreground">
              {Object.keys(r.variables).length} inputs · {r.model ?? "model unknown"} · {replayCostLine(r.estimated_cost_usd)}
            </span>
            <Link className="ml-auto underline" href={heldRunHref(r.id)}>
              Open the run
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
