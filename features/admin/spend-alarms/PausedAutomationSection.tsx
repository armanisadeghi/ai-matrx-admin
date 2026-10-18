"use client";
// The fix for a guardrail pause, on the alarm record page: what was paused, why, its numbers,
// and Resume (scheduler.automation_guardrail_resume — the super-admin door).
import { useEffect, useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import {
  fetchGuardrailStatus,
  resumeAutomation,
  type GuardrailKind,
  type GuardrailStatus,
} from "@/features/scheduling/service/automationGuardrails";
import { toast } from "@/lib/toast";

interface Props {
  kind: GuardrailKind;
  subjectId: string;
  onResumed?: () => void;
}

function usd(v: number | null | undefined): string {
  return v == null ? "—" : formatAdminUsd(v);
}

export function PausedAutomationSection({ kind, subjectId, onResumed }: Props) {
  const [status, setStatus] = useState<GuardrailStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchGuardrailStatus(kind, subjectId)
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus(null));
    return () => {
      alive = false;
    };
  }, [kind, subjectId, version]);

  if (!status) return null;
  const g = status.guardrails;
  const paused = !status.enabled;

  const resume = async () => {
    setBusy(true);
    try {
      const ok = await resumeAutomation(kind, subjectId);
      toast.success(ok ? "Automation resumed" : "Already running");
      setVersion((v) => v + 1);
      onResumed?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{paused ? "Automation paused" : "Automation running"}</h2>
        {paused ? (
          <Button variant="outline" disabled={busy} onClick={() => void resume()}>
            Resume
          </Button>
        ) : null}
      </div>
      <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
        {paused && status.paused?.reason ? (
          <>
            <dt className="text-muted-foreground">Why</dt>
            <dd>{status.paused.reason}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Per run</dt>
        <dd>
          {usd(g.max_cost_usd_per_run)} · {g.max_turns ?? "—"} turns
        </dd>
        <dt className="text-muted-foreground">Caps</dt>
        <dd>
          {usd(g.max_cost_usd_daily)} day · {usd(g.max_cost_usd_weekly)} week · {usd(g.max_cost_usd_monthly)} month
        </dd>
        <dt className="text-muted-foreground">Spent</dt>
        <dd>
          {usd(status.spend.day)} day · {usd(status.spend.week)} week · {usd(status.spend.month)} month
        </dd>
      </dl>
    </section>
  );
}
