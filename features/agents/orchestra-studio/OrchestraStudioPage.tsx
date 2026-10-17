"use client";

import { ProTextarea } from "@/components/official/ProTextarea";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2, MoreHorizontal, Network, Plus, Workflow, Wrench } from "lucide-react";
import { cn } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import PageHeader from "@/features/shell/components/header/PageHeader";
import MarkdownStream from "@ai-matrx/chat/ui/markdown-stream/MarkdownStream";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { supabase } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { parsePlannerAnswer, planText, stepBadge, studioHrefForStep } from "./parse-plan";
import { runPlanner } from "./planner";
import { listMyPlans, loadPlan, saveNewPlan, savePlanChanges, type SavedPlanSummary } from "./plan-store";
import { planProgress, statusLabel } from "./plan-progress";
import { readStepAgents, type StepAgentInfo } from "./step-agents";
import { useMakeOrchestra } from "./make-orchestra";
import type { SystemPlan, SystemPlanStep } from "./types";

async function agentNameOf(id: string): Promise<string | null> {
  const { data } = await supabase.schema("agent").from("definition").select("name").eq("id", id).maybeSingle();
  return data?.name ?? null;
}

function StatusChip({ step, info, className }: { step: SystemPlanStep; info: StepAgentInfo | undefined; className?: string }) {
  if (!step.usesAgentId) {
    return (
      <span className={cn("shrink-0 rounded-full border border-border px-2 py-0.5 type-meta text-muted-foreground", className)} data-testid="step-status">
        No agent yet
      </span>
    );
  }
  const status = info?.status;
  const ok = status === "ready";
  return (
    <span
      className={cn(
        "inline-flex max-w-[55%] shrink-0 items-center gap-1 rounded-full px-2 py-0.5 type-meta",
        className,
        ok ? "bg-success/10 text-success" : status ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
      )}
      data-testid="step-status"
    >
      {ok ? <Check className="h-3 w-3 shrink-0" /> : null}
      <span className="truncate">{info?.name ?? step.usesAgentName ?? "Agent"}</span>
      <span className="shrink-0">· {status ? statusLabel(status) : "…"}</span>
    </span>
  );
}

function StepRow({
  step,
  href,
  info,
  onUseAgent,
  onClear,
}: {
  step: SystemPlanStep;
  href: string;
  info: StepAgentInfo | undefined;
  onUseAgent: (agentId: string) => void;
  onClear: () => void;
}) {
  const badge = stepBadge(step);
  const summary = step.summary ?? step.job;
  const full = (step.markdown ?? "").trim();
  const hasMore = full !== "" && full !== summary;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const has = Boolean(step.usesAgentId);
  return (
    <li className="rounded-lg border border-border bg-card p-3" data-testid={`plan-step-${step.n}`}>
      <div className="flex h-7 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 type-meta font-semibold text-primary-ink">
          {step.n}
        </span>
        <span className="min-w-0 flex-1 truncate type-body font-medium text-foreground">{step.title}</span>
        {badge ? <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 type-meta text-muted-foreground sm:inline">{badge}</span> : null}
        <StatusChip step={step} info={info} className="hidden sm:inline-flex" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" icon={<MoreHorizontal />} aria-label={`Step ${step.n} options`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasMore ? (
              <DropdownMenuItem onSelect={() => setOpen((v) => !v)}>{open ? "Hide the full step" : "Show the full step"}</DropdownMenuItem>
            ) : null}
            {has ? (
              <DropdownMenuItem onSelect={() => window.open(`/agents/${step.usesAgentId}/build`, "_blank")}>Open the agent</DropdownMenuItem>
            ) : null}
            {has ? <DropdownMenuItem onSelect={onClear}>Take the agent off this step</DropdownMenuItem> : null}
            <DropdownMenuItem asChild>
              <Link href={href}>{has ? "Build a different agent" : "Build this agent"}</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-1 pl-8 sm:hidden">
        <StatusChip step={step} info={info} className="max-w-full" />
      </div>
      {summary ? <p className="mt-1 line-clamp-3 pl-8 type-secondary text-muted-foreground">{summary}</p> : null}
      {open && hasMore ? (
        <div className="mt-2 ml-8 border-l border-border pl-3" data-message-content>
          <MarkdownStream content={step.markdown} hideCopyButton allowFullScreenEditor={false} />
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
        {has ? (
          <Button variant="outline" iconEnd={<ArrowRight />} onClick={() => router.push(`/agents/${step.usesAgentId}/build`)}>
            Open agent
          </Button>
        ) : (
          <Button asChild variant="primary">
            <Link href={href} data-testid={`build-step-${step.n}`}>
              <Wrench className="mr-1 h-3.5 w-3.5" />
              Build this agent
            </Link>
          </Button>
        )}
        <AgentListDropdown
          consumerId="orchestra-studio-step-agent"
          activeAgentId={step.usesAgentId}
          onSelect={onUseAgent}
          showPinnedAgent={false}
          triggerSlot={
            <Button variant="outline" type="button" data-testid={`use-existing-${step.n}`}>
              {has ? "Use another agent" : "Use existing agent"}
            </Button>
          }
        />
      </div>
    </li>
  );
}

export default function OrchestraStudioPage() {
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const planId = params.get("plan");

  const [description, setDescription] = useState("");
  const [loadedPlan, setPlan] = useState<SystemPlan | null>(null);
  const plan = planId ? loadedPlan : null;
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPlanSummary[] | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(planId !== null);
  const justCreated = useRef<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<Map<string, StepAgentInfo>>(new Map());
  const [showAnswer, setShowAnswer] = useState(false);
  const { make, step: makingStep } = useMakeOrchestra();

  // The agents the steps use: one read when a plan is open, and again when the person returns from the Studio.
  const agentIds = plan ? plan.steps.flatMap((s) => (s.usesAgentId ? [s.usesAgentId] : [])).join(",") : "";
  useEffect(() => {
    if (!agentIds) return;
    let live = true;
    readStepAgents(agentIds.split(","))
      .then((m) => live && setAgentInfo(m))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [agentIds]);

  useEffect(() => {
    let live = true;
    listMyPlans()
      .then((rows) => live && setSaved(rows))
      .catch((e) => live && setFailure(e instanceof Error ? e.message : "Could not read your saved plans."));
    return () => {
      live = false;
    };
  }, [planId]);

  useEffect(() => {
    if (!planId) return;
    if (justCreated.current === planId) return;
    let live = true;
    setLoadingPlan(true);
    loadPlan(planId)
      .then((p) => {
        if (!live) return;
        if (!p) setFailure("That plan could not be opened.");
        setPlan(p);
      })
      .catch((e) => live && setFailure(e instanceof Error ? e.message : "That plan could not be opened."))
      .finally(() => live && setLoadingPlan(false));
    return () => {
      live = false;
    };
  }, [planId]);

  async function plan_it() {
    const text = description.trim();
    if (!text || running) return;
    setRunning(true);
    setFailure(null);
    try {
      const { answer, conversationId } = await runPlanner(dispatch, text, "user");
      const parsed = parsePlannerAnswer(answer, text, conversationId);
      const id = await saveNewPlan(parsed);
      justCreated.current = id;
      setPlan(parsed);
      router.replace(`/agents/orchestra-studio?plan=${id}`);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The plan could not be made.");
    } finally {
      setRunning(false);
    }
  }

  async function chooseAgent(step: SystemPlanStep, agentId: string) {
    if (!plan || !planId) return;
    const name = await agentNameOf(agentId);
    const next: SystemPlan = {
      ...plan,
      steps: plan.steps.map((s) => (s.n === step.n ? { ...s, usesAgentId: agentId, usesAgentName: name } : s)),
    };
    setPlan(next);
    try {
      await savePlanChanges(planId, next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The choice could not be saved.");
    }
  }

  async function clearAgent(step: SystemPlanStep) {
    if (!plan || !planId) return;
    const next: SystemPlan = {
      ...plan,
      steps: plan.steps.map((s) => (s.n === step.n ? { ...s, usesAgentId: null, usesAgentName: null } : s)),
    };
    setPlan(next);
    try {
      await savePlanChanges(planId, next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The change could not be saved.");
    }
  }

  async function turnIntoOrchestra() {
    if (!plan || !planId || makingStep) return;
    setFailure(null);
    const res = await make(plan);
    if ("error" in res) {
      setFailure(res.error);
      return;
    }
    const next: SystemPlan = { ...plan, orchestraConductorId: res.conductorId };
    setPlan(next);
    try {
      await savePlanChanges(planId, next);
    } catch {
      /* the Orchestra exists; the link back from the plan is best-effort */
    }
    if (res.warnings.length) toast.error("Orchestra made, with problems", { description: res.warnings.join(" ") });
    router.push(`/agents/orchestras/${res.conductorId}`);
  }

  const progress = plan ? planProgress(plan) : { built: 0, total: 0 };
  const allBuilt = progress.total > 0 && progress.built === progress.total;

  return (
    <>
      <PageHeader>
        <div className="flex w-full min-w-0 items-center">
          <ChevronLeftTapButton
            onClick={() => (plan ? router.push("/agents/orchestra-studio") : router.push("/agents/new"))}
            variant="transparent"
            ariaLabel="Back"
          />
          <Network className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="ml-2 truncate type-title text-foreground">
            {plan ? plan.title : "Orchestra Studio"}
          </span>
          <div className="ml-auto flex items-center">
            {plan ? (
              <Button variant="quiet" icon={<Plus />} aria-label="New plan" onClick={() => router.push("/agents/orchestra-studio")}>
                <span className="hidden sm:inline">New</span>
              </Button>
            ) : null}
          </div>
        </div>
      </PageHeader>

      <div className="bg-textured h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-[var(--shell-header-h)]">
          {failure ? (
            <div role="alert" className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 type-secondary text-foreground">
              {failure}
              <ErrorAlchemyMenu error={failure} />
            </div>
          ) : null}

          {loadingPlan ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : plan ? (
            <div className="space-y-3">
              <div className="flex h-10 items-center gap-3" data-testid="plan-progress-row">
                <span className="shrink-0 type-secondary text-foreground" data-testid="plan-progress">
                  {progress.built} of {progress.total}<span className="hidden sm:inline"> steps have an agent</span><span className="sm:hidden"> built</span>
                </span>
                <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress.total ? (progress.built / progress.total) * 100 : 0}%` }}
                  />
                </div>
                {plan.orchestraConductorId ? (
                  <Button asChild variant="primary">
                    <Link href={`/agents/orchestras/${plan.orchestraConductorId}`} data-testid="open-orchestra">
                      <Network className="mr-1 h-3.5 w-3.5" />
                      Open Orchestra
                    </Link>
                  </Button>
                ) : (
                  <Button
                   
                    variant="primary"
                    type="button"
                    disabled={!allBuilt || Boolean(makingStep)}
                    onClick={turnIntoOrchestra}
                    data-testid="turn-into-orchestra"
                    title={allBuilt ? undefined : "Every step needs an agent first"}
                  >
                    {makingStep ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1 h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Turn into an Orchestra</span>
                    <span className="sm:hidden">Orchestra</span>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="quiet" icon={<MoreHorizontal />} aria-label="Plan options" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setShowAnswer((v) => !v)}>
                      {showAnswer ? "Hide the Architect's full answer" : "Show the Architect's full answer"}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/agents/orchestra-studio">Plan something else</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {makingStep ? (
                <p className="type-secondary text-muted-foreground" role="status" data-testid="making-orchestra">
                  {makingStep}
                </p>
              ) : null}
              {plan.recommendation ? <p className="type-body text-muted-foreground">{plan.recommendation}</p> : null}
              {plan.steps.length > 0 ? (
                <ol className="space-y-2" aria-label="Plan steps">
                  {plan.steps.map((step) => (
                    <StepRow
                      key={step.n}
                      step={step}
                      href={studioHrefForStep(plan, step, planId)}
                      info={step.usesAgentId ? agentInfo.get(step.usesAgentId) : undefined}
                      onUseAgent={(id) => chooseAgent(step, id)}
                      onClear={() => clearAgent(step)}
                    />
                  ))}
                </ol>
              ) : (
                <div className="rounded-lg border border-border bg-card p-3 type-secondary text-muted-foreground">
                  No step list found in this answer. The full answer is below.
                </div>
              )}
              {showAnswer || plan.steps.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-3" data-message-content>
                  <MarkdownStream content={planText(plan.answer)} hideCopyButton allowFullScreenEditor={false} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 pt-2">
                <h1 className="type-title text-foreground">What job should this system do, every time?</h1>
                <ProTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Every week I teach a new chapter of AP Biology. Given the chapter, write a quiz that checks real understanding…"
                  rows={5}
                  disabled={running}
                />
                <div className="flex items-center justify-end gap-2">
                  {running ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Planning" /> : null}
                  <Button type="button" onClick={plan_it} disabled={running || description.trim().length === 0}>
                    <Workflow className="mr-1 h-4 w-4" />
                    Plan it
                  </Button>
                </div>
              </div>

              {saved && saved.length > 0 ? (
                <section aria-label="Saved plans" className="space-y-2">
                  <h2 className="type-meta uppercase tracking-wide text-muted-foreground">Your plans</h2>
                  <ul className="space-y-1.5">
                    {saved.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/agents/orchestra-studio?plan=${p.id}`}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2",
                            "hover:border-primary/40",
                          )}
                        >
                          <span className="min-w-0 truncate type-body text-foreground">{p.title}</span>
                          <span className="shrink-0 type-meta text-muted-foreground">{p.stepCount} steps</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
