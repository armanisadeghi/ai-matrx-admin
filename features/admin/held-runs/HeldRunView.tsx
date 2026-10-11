"use client";

// record-view: HeldRunView — one run a spend gate stopped (billing.held_run): what it was going to
// do (mandate, agent + version, model, inputs, context, the system prompt and messages, tools) and
// "Replay and watch" — the same mandate with the frozen inputs, as the person who clicks, streamed
// in the chat window. Every replay is kept on the held run (billing.held_run_note_replay).

import { fetchMandateLabels } from "@/features/admin/spend-alarms/spendAlarms";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw } from "lucide-react";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KpiTile } from "@/components/official/kpi/KpiTile";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { adminScheduleHref } from "@/features/scheduling/constants/routes";
import { patchSystemTask } from "@/features/scheduling/service/schedulerClient";
import {
  agentBuildHref,
  fetchHeldRun,
  fetchHeldRunsForAlarm,
  GATE_LABEL,
  heldRunHref,
  mandateAdminHref,
  messageText,
  noteHeldRunReplay,
  replayCostLine,
  replayLaunch,
  variableRows,
  type HeldRun,
} from "./heldRuns";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-md border border-border bg-card">
      <h2 className="border-b border-border px-3 py-2 text-sm font-medium">{title}</h2>
      <div className="p-3">{children}</div>
    </section>
  );
}

function ValueBlock({ value }: { value: string }) {
  // An inspector of the frozen run: raw values (with their __kind) are the point here.
  return <pre data-kind-source="explicit" className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 text-xs">{value}</pre>;
}

/** `id` is a held run id, or an alarm id (the dock's door) — then the alarm's newest held run opens. */
export function HeldRunView({ id }: { id: string }) {
  const [run, setRun] = useState<HeldRun | null>(null);
  const [mandateLabel, setMandateLabel] = useState<string | null>(null);
  const [siblings, setSiblings] = useState<HeldRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [taskEnabled, setTaskEnabled] = useState<boolean | null>(null);
  const { launchMandate, launchAgent } = useAgentLauncher();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const direct = await fetchHeldRun(id);
        const list = direct ? [] : await fetchHeldRunsForAlarm(id);
        if (!live) return;
        const found = direct ?? list[0] ?? null;
        setRun(found);
        if (found?.mandate_key) {
          const labels = await fetchMandateLabels([found.mandate_key]).catch(() => new Map<string, string>());
          if (live) setMandateLabel(labels.get(found.mandate_key) ?? null);
        }
        setSiblings(list);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  const replay = async () => {
    if (!run) return;
    setStarting(true);
    const plan = replayLaunch(run, "current");
    const options = {
      surfaceKey: `held-run:${run.id}`,
      sourceFeature: "billing" as const,
      config: { displayMode: "floating-chat" as const, autoRun: true, allowChat: true },
      runtime: { variables: plan.variables, ...(plan.userInput ? { userInput: plan.userInput } : {}) },
    };
    try {
      const result =
        plan.door === "mandate" && plan.mandateKey
          ? await launchMandate(storedMandateKey(plan.mandateKey), options)
          : plan.agentId
            ? await launchAgent(plan.agentId, options)
            : null;
      if (!result) throw new Error("This held run names no mandate or agent to replay");
      setRun(await noteHeldRunReplay(run.id, result.conversationId, "current", run.agent_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const taskId = run?.refs.task_id ?? null;
  const setTask = async (enabled: boolean) => {
    if (!taskId) return;
    try {
      await patchSystemTask(taskId, { enabled });
      setTaskEnabled(enabled);
      toast.success(enabled ? "Automation resumed" : "Automation paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const replays = run?.replays ?? [];
  const label = run ? (mandateLabel ?? run.agent_name ?? run.mandate_key ?? "Held run") : loading ? "Held run" : "Held run not found";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RecordPageHeader
        backHref="/administration/billing/alarms"
        parents={[
          { label: "Billing", href: "/administration/billing" },
          { label: "Alarms", href: "/administration/billing/alarms" },
        ]}
        record={{ name: label }}
        status={run ? { label: GATE_LABEL[run.gate] ?? run.gate, tone: "neutral" } : undefined}
        actions={[]}
      />
      <div className="h-full overflow-y-auto px-4 pb-16 pt-4 sm:px-6" data-testid="held-run">
        {error ? (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
            <ErrorAlchemyMenu error={error} />
          </div>
        ) : null}
        {!loading && !run && !error ? (
          <p className="text-sm text-muted-foreground">No run was kept for this alarm.</p>
        ) : null}
        {run ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="held-run-actions">
              <Button variant="primary" disabled={starting} onClick={() => setConfirming(true)}>
                {replays.length ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {replays.length ? "Replay again" : "Replay and watch"}
              </Button>
              <span className="text-sm text-muted-foreground">{replayCostLine(run.estimated_cost_usd)}</span>
              {taskId ? (
                <>
                  <Button variant="outline" onClick={() => void setTask(false)} disabled={taskEnabled === false}>
                    <Pause className="h-4 w-4" /> Pause automation
                  </Button>
                  <Button variant="quiet" onClick={() => void setTask(true)} disabled={taskEnabled === true}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                  <Link className="text-sm underline" href={adminScheduleHref(taskId)}>
                    Open automation
                  </Link>
                </>
              ) : null}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiTile label="Stopped" value={`${run.occurrence_count.toLocaleString()} ×`} hint={new Date(run.last_seen_at).toLocaleString()} />
              <KpiTile label="Driver" value={run.driver ?? "—"} hint={GATE_LABEL[run.gate] ?? run.gate} />
              <KpiTile label="Model" value={run.model ?? "—"} hint={run.tools?.length ? `${run.tools.length} tools` : "No tools"} />
              <KpiTile label="Replays" value={String(replays.length)} hint={replayCostLine(run.estimated_cost_usd)} />
            </div>

            <Section title="What ran">
              <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
                <dt className="text-muted-foreground">Mandate</dt>
                <dd>{run.mandate_key ? <>
                      <Link className="underline" href={mandateAdminHref(run.mandate_key)}>{mandateLabel ?? run.mandate_key}</Link>
                      {mandateLabel ? <span className="ml-2 text-xs text-muted-foreground">{run.mandate_key}</span> : null}
                    </> : "—"}</dd>
                <dt className="text-muted-foreground">Agent</dt>
                <dd>
                  {run.agent_id ? (
                    <Link className="underline" href={agentBuildHref(run.agent_id)}>
                      {run.agent_name ?? "Agent"}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {run.agent_version_number ? <Badge className="ml-2">v{run.agent_version_number}</Badge> : null}
                </dd>
                <dt className="text-muted-foreground">Why stopped</dt>
                <dd>{run.refusal_message ?? "—"}</dd>
              </dl>
            </Section>

            <Section title={`Inputs · ${Object.keys(run.variables).length}`}>
              <div className="space-y-2" data-testid="held-run-inputs">
                {variableRows(run.variables).map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">{row.name}</div>
                    <ValueBlock value={row.value || "(empty)"} />
                  </div>
                ))}
                {typeof run.user_input === "string" && run.user_input ? (
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Typed message</div>
                    <ValueBlock value={run.user_input} />
                  </div>
                ) : null}
              </div>
            </Section>

            {run.context_entries && Object.keys(run.context_entries).length ? (
              <Section title="Context">
                {variableRows(run.context_entries).map((row) => (
                  <div key={row.name} className="mb-2">
                    <div className="mb-1 text-xs font-medium text-muted-foreground">{row.name}</div>
                    <ValueBlock value={row.value} />
                  </div>
                ))}
              </Section>
            ) : null}

            <Section title={`What the agent would have seen · ${run.messages?.length ?? 0} messages`}>
              <div className="space-y-2">
                {(run.messages ?? []).map((m, i) => (
                  <div key={i}>
                    <div className="mb-1 text-xs font-medium capitalize text-muted-foreground">{m.role}</div>
                    <ValueBlock value={messageText(m.content)} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title={`Tools · ${run.tools?.length ?? 0}`}>
              <div className="flex flex-wrap gap-1">
                {(run.tools ?? []).length ? (run.tools ?? []).map((t) => <Badge key={t}>{t}</Badge>) : <span className="text-sm text-muted-foreground">None</span>}
              </div>
            </Section>

            <Section title={`Replays · ${replays.length}`}>
              <ul className="space-y-1 text-sm" data-testid="held-run-replays">
                {replays.map((r, i) => (
                  <li key={r.conversation_id}>
                    <Link className="underline" href={`/chat/${r.conversation_id}`}>
                      Replay {i + 1}
                    </Link>{" "}
                    <span className="text-muted-foreground">· {new Date(r.at).toLocaleString()} · {r.version_mode} version</span>
                  </li>
                ))}
                {replays.length === 0 ? <li className="text-muted-foreground">Not replayed yet</li> : null}
              </ul>
            </Section>

            {siblings.length > 1 ? (
              <Section title={`Other runs this alarm stopped · ${siblings.length - 1}`}>
                <ul className="space-y-1 text-sm">
                  {siblings
                    .filter((s) => s.id !== run.id)
                    .map((s) => (
                      <li key={s.id}>
                        <Link className="underline" href={heldRunHref(s.id)}>
                          {(s.mandate_key && s.mandate_key === run?.mandate_key && mandateLabel) || s.agent_name || s.mandate_key || "Held run"}
                        </Link>{" "}
                        <span className="text-muted-foreground">· {new Date(s.last_seen_at).toLocaleString()}</span>
                      </li>
                    ))}
                </ul>
              </Section>
            ) : null}
          </>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={replays.length ? "Replay this run again?" : "Replay this run?"}
        description={`Runs ${mandateLabel ?? run?.agent_name ?? run?.mandate_key ?? "it"} once as you, with the same inputs, on the current version. ${replayCostLine(run?.estimated_cost_usd ?? null)}, billed to you.`}
        confirmLabel="Replay and watch"
        onConfirm={() => {
          setConfirming(false);
          void replay();
        }}
      />
    </div>
  );
}
