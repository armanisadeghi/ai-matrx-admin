"use client";

// The alarm record page's one mount: the runs this alarm stopped, each opening its held-run view.
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchHeldRunsForAlarm, heldRunHref, replayCostLine, type HeldRun } from "./heldRuns";

export function HeldRunsSection({ alarmId }: { alarmId: string }) {
  const [runs, setRuns] = useState<HeldRun[] | null>(null);
  useEffect(() => {
    let live = true;
    fetchHeldRunsForAlarm(alarmId)
      .then((r) => live && setRuns(r))
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
              {r.mandate_key ?? r.agent_name ?? "Held run"}
            </Link>
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
