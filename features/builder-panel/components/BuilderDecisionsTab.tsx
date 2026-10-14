"use client";

/**
 * Decisions tab — for each round (workflow run): the path it chose, every signal against its threshold, the
 * entry checks in the order they were tried, any escalation, the steps it skipped and why, and its hard cost;
 * then the cost per path across rounds. Reads the stored `path_decision` step output (aidream
 * `brand.identify.path_decision`). Design: common-docs/.../smart-add-brand/PATHS.md.
 */

import { useState } from "react";
import { ArrowRight, Check, CircleDot, X } from "lucide-react";
import { Badge, Button, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { costByPath, thresholdText, valueText, type RoundDecision } from "../decisions";
import { BuilderJson } from "./BuilderJson";

function pathName(key: string): string {
  return key.replace(/_/g, " ");
}

export function BuilderDecisionsTab({
  rounds,
  onOpenStep,
}: {
  rounds: RoundDecision[];
  onOpenStep: (runId: string, nodeId: string | null) => void;
}) {
  const { format } = useCostDisplay();
  const [picked, setPicked] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  if (!rounds.length) return <p className="p-3 text-xs text-muted-foreground">No workflow run on this page yet</p>;
  const current = rounds.find((r) => r.runId === picked) ?? rounds[rounds.length - 1];
  const d = current.decision;
  const options: SelectOption<string>[] = rounds.map((r, i) => ({
    value: r.runId,
    label: `${i + 1}. ${r.decision?.label ?? "No decision"} · ${r.label}`,
  }));
  const chosen = d?.checks.find((c) => c.passed)?.path ?? null;
  const totals = costByPath(rounds);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Select aria-label="Round" value={current.runId} onValueChange={setPicked} options={options} />
        <span className="truncate font-mono text-[11px] text-muted-foreground">{current.runId}</span>
        <Button variant="quiet" className="ml-auto" onClick={() => onOpenStep(current.runId, "path_decision")}>
          Open step
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3 text-xs">
        {d ? (
          <>
            <section className="flex flex-wrap items-center gap-2">
              <Badge tone={d.built ? "success" : "warning"}>{d.label}</Badge>
              {!d.built ? (
                <span className="text-muted-foreground">runs as {pathName(d.runsAs)}</span>
              ) : null}
              <span className="text-muted-foreground">
                {d.subject} · {d.roundKind ?? "round"} · thresholds {d.thresholdsSource}
              </span>
              <span className="ml-auto tabular-nums text-muted-foreground">{format(current.costUsd)}</span>
            </section>
            {d.flag ? <p className="text-amber-700 dark:text-amber-400">{d.flag}</p> : null}
            {d.escalation ? (
              <p className="flex items-center gap-1.5">
                <span className="font-medium">Escalated</span>
                {pathName(d.escalation.from)} <ArrowRight className="h-3 w-3" /> {pathName(d.escalation.to)}
                <span className="text-muted-foreground">· {d.escalation.reason}</span>
              </p>
            ) : null}
            {!d.measured ? <p className="text-muted-foreground">{d.why}</p> : null}
            {d.subjectHint ? (
              <p className="text-muted-foreground">
                Homepage reads as a {String(d.subjectHint.verdict)}: {valueText(d.subjectHint.signals)}
              </p>
            ) : null}

            {d.signals.length ? (
              <section>
                <h3 className="mb-1 font-medium">Signals</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                      <th className="py-1 pr-2 font-medium">Signal</th>
                      <th className="py-1 pr-2 font-medium">Value</th>
                      <th className="py-1 pr-2 font-medium">Threshold</th>
                      <th className="py-1 font-medium">Fired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.signals.map((s) => (
                      <tr key={s.key} className="border-b border-border/60 align-top" title={s.source}>
                        <td className="py-1 pr-2">{s.label}</td>
                        <td className="max-w-[18rem] truncate py-1 pr-2 font-mono tabular-nums" title={valueText(s.value)}>
                          {valueText(s.value)}
                        </td>
                        <td className="py-1 pr-2 font-mono text-muted-foreground">{thresholdText(s)}</td>
                        <td className="py-1">
                          {s.op ? (
                            s.fired ? (
                              <CircleDot className="h-3.5 w-3.5 text-primary" aria-label="fired" />
                            ) : (
                              <span className="text-muted-foreground">no</span>
                            )
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}

            {d.checks.length ? (
              <section>
                <h3 className="mb-1 font-medium">Entry checks, in order</h3>
                <ol className="space-y-0.5">
                  {d.checks.map((c) => (
                    <li key={c.path} className={cn("flex items-center gap-1.5", c.path === chosen && "font-medium")}>
                      {c.passed ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{pathName(c.path)}</span>
                      <span className="truncate text-muted-foreground">· {c.because.join(", ")}</span>
                      {c.path === chosen ? <Badge tone="primary">chosen</Badge> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">{current.missing}</p>
        )}

        <section>
          <h3 className="mb-1 font-medium">Skipped steps</h3>
          {current.skipped.length ? (
            <ul className="space-y-0.5">
              {current.skipped.map((s) => (
                <li key={s.title} className="flex gap-1.5">
                  <span>{s.title}</span>
                  <span className="truncate text-muted-foreground">· {s.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">None</p>
          )}
        </section>

        <section>
          <h3 className="mb-1 font-medium">Cost by path</h3>
          <table className="w-full border-collapse">
            <tbody>
              {totals.map((t) => (
                <tr key={t.path} className="border-b border-border/60">
                  <td className="py-1 pr-2">{t.label}</td>
                  <td className="py-1 pr-2 text-muted-foreground">
                    {t.rounds} round{t.rounds === 1 ? "" : "s"}
                  </td>
                  <td className="py-1 text-right tabular-nums">{format(t.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {d ? (
          <section>
            <Button variant="quiet" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "Hide record" : "Show record"}
            </Button>
            {showRaw ? <BuilderJson data={d.raw} label="path_decision" location="Decisions" className="mt-2 h-80" /> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
