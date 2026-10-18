"use client";

import { ProTextarea } from "@/components/official/ProTextarea";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2, MoreHorizontal, Network, Plus, Workflow, Wrench } from "lucide-react";
import { cn } from "@ai-matrx/design-system";
import { Button, Input, Tile } from "@ai-matrx/design-system/controls";
import { StudioStage } from "@/features/agents/studio/components/StudioStage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import PageHeader from "@/features/shell/components/header/PageHeader";
import MarkdownStream from "@ai-matrx/chat/ui/markdown-stream/MarkdownStream";
import { AgentListDropdown, useAgentListCore } from "@ai-matrx/agents/catalog/react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { supabase } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { parsePlannerAnswer, planText, stepBadge, studioHrefForStep } from "./parse-plan";
import { runPlanner } from "./planner";
import { listMyPlans, loadPlan, saveNewPlan, savePlanChanges, type SavedPlanSummary } from "./plan-store";
import { otherSteps, planProgress, statusLabel } from "./plan-progress";
import { needsAgent, stepKind } from "./step-kind";
import { confidenceLabel, fitScore, matchStep, type StepMatch } from "./step-match";
import { readStepAgents, type StepAgentInfo } from "./step-agents";
import { useMakeOrchestra } from "./make-orchestra";
import type { SystemPlan, SystemPlanStep } from "./types";

async function agentNameOf(id: string): Promise<string | null> {
  const { data } = await supabase.schema("agent").from("definition").select("name").eq("id", id).maybeSingle();
  return data?.name ?? null;
}

function StatusChip({
  step,
  info,
  fit,
  className,
}: {
  step: SystemPlanStep;
  info: StepAgentInfo | undefined;
  /** How well the agent on this step fits it, when it was put there before fit was checked. */
  fit: number | null;
  className?: string;
}) {
  const kind = stepKind(step);
  if (!step.usesAgentId) {
    if (kind !== "agent") return null;
    return (
      <span className={cn("shrink-0 rounded-full border border-border px-2 py-0.5 type-meta text-muted-foreground", className)} data-testid="step-status">
        No agent yet
      </span>
    );
  }
  const status = info?.status;
  // Ready means the agent exists AND a person said it does this job. An agent that was never confirmed and fits weakly is not Ready.
  const unconfirmed = !step.agentConfirmed && (fit ?? 0) < 0.34;
  const ok = status === "ready" && !unconfirmed;
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
      <span className="shrink-0">· {unconfirmed && status === "ready" ? "Confirm fit" : status ? statusLabel(status) : "…"}</span>
    </span>
  );
}

/** A one-line note saved on a step (who builds this code, who does this by hand). */
function NoteEditor({
  label,
  placeholder,
  initial,
  onSave,
  onCancel,
  testId,
}: {
  label: string;
  placeholder: string;
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  testId: string;
}) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text.trim());
      }}
    >
      <Input
        autoFocus
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-w-48 flex-1"
        data-testid={`${testId}-input`}
      />
      <Button type="submit" variant="outline" data-testid={`${testId}-save`}>
        Save
      </Button>
      <Button type="button" variant="quiet" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

function StepRow({
  step,
  href,
  info,
  match,
  fit,
  isNext,
  onUseAgent,
  onConfirm,
  onClear,
  onNote,
}: {
  step: SystemPlanStep;
  href: string;
  info: StepAgentInfo | undefined;
  match: StepMatch | null;
  fit: number | null;
  /** The first agent step still waiting for an agent: the page's one primary action. */
  isNext: boolean;
  onUseAgent: (agentId: string) => void;
  onConfirm: () => void;
  onClear: () => void;
  onNote: (field: "codeNote" | "assignee", text: string) => void;
}) {
  const badge = stepBadge(step);
  const kind = stepKind(step);
  const summary = step.summary ?? step.job;
  const full = (step.markdown ?? "").trim();
  const hasMore = full !== "" && full !== summary;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const has = Boolean(step.usesAgentId);
  const field = kind === "code" ? "codeNote" : "assignee";
  const note = (kind === "code" ? step.codeNote : step.assignee) ?? "";
  const weakAssigned = has && !step.agentConfirmed && (fit ?? 0) < 0.34;
  return (
    <li className="rounded-lg border border-border bg-card p-3" data-testid={`plan-step-${step.n}`} data-step-kind={kind}>
      <div className="flex h-7 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 type-meta font-semibold text-primary-ink">
          {step.n}
        </span>
        <span className="min-w-0 flex-1 truncate type-body font-medium text-foreground">{step.title}</span>
        {badge ? <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 type-meta text-muted-foreground sm:inline">{badge}</span> : null}
        <StatusChip step={step} info={info} fit={fit} className="hidden sm:inline-flex" />
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
            {kind !== "agent" || has ? (
              <DropdownMenuItem asChild>
                <Link href={href}>{has ? "Build a different agent" : "Build an agent for this step instead"}</Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 pl-8 sm:hidden">
        {badge ? <span className="shrink-0 rounded-full border border-border px-2 py-0.5 type-meta text-muted-foreground">{badge}</span> : null}
        <StatusChip step={step} info={info} fit={fit} className="max-w-full" />
      </div>
      {summary ? <p className="mt-1 line-clamp-3 pl-8 type-secondary text-muted-foreground">{summary}</p> : null}
      {open && hasMore ? (
        <div className="mt-2 ml-8 border-l border-border pl-3" data-message-content>
          <MarkdownStream content={step.markdown} hideCopyButton allowFullScreenEditor={false} />
        </div>
      ) : null}

      {kind === "agent" && !has && match ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-8" data-testid={`match-${step.n}`}>
          <span className="type-secondary text-foreground">
            <span className="font-medium">{match.agentName}</span>
            <span className="text-muted-foreground"> · {confidenceLabel(match)}</span>
          </span>
          <Button variant="outline" type="button" onClick={() => onUseAgent(match.agentId)} data-testid={`use-match-${step.n}`}>
            Use this one
          </Button>
        </div>
      ) : null}
      {weakAssigned ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-8" data-testid={`weak-fit-${step.n}`}>
          <span className="type-secondary text-warning">
            Not a clear fit for this step{fit !== null ? ` (${Math.round(fit * 100)}%)` : ""}. Check that it does this job.
          </span>
          <Button variant="outline" type="button" onClick={onConfirm}>
            Yes, keep it
          </Button>
          <Button variant="quiet" type="button" onClick={onClear}>
            Take it off
          </Button>
        </div>
      ) : null}

      {kind === "agent" || has ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
          {has ? (
            <Button variant="outline" iconEnd={<ArrowRight />} onClick={() => router.push(`/agents/${step.usesAgentId}/build`)}>
              Open agent
            </Button>
          ) : (
            <Button asChild variant={isNext ? "primary" : "outline"}>
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
              <Button variant={has ? "quiet" : "outline"} type="button" data-testid={`use-existing-${step.n}`}>
                {has ? "Use another agent" : "Use existing agent"}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-2 pl-8" data-testid={`${kind}-step-${step.n}`}>
          {editing ? (
            <NoteEditor
              label={kind === "code" ? "Who builds this code" : "Who does this step"}
              placeholder={kind === "code" ? "Who builds this? A name or a team" : "Name or role, for example Clinician"}
              initial={note}
              testId={`note-${step.n}`}
              onCancel={() => setEditing(false)}
              onSave={(text) => {
                onNote(field, text);
                setEditing(false);
              }}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {note ? (
                <span className="type-secondary text-foreground" data-testid={`note-${step.n}`}>
                  {kind === "code" ? "Built by " : "Done by "}
                  <span className="font-medium">{note}</span>
                </span>
              ) : null}
              <Button variant="outline" type="button" onClick={() => setEditing(true)} data-testid={`note-edit-${step.n}`}>
                {kind === "code" ? (note ? "Change who builds it" : "Note who builds it") : note ? "Change the person" : "Assign a person"}
              </Button>
            </div>
          )}
        </div>
      )}
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
  // The person's own agents, read once a plan is open: suggestions for steps and the fit of agents already chosen.
  const { agents: myAgents } = useAgentListCore({ consumerId: "orchestra-studio-match", visibleTabs: ["mine", "shared"], loadOnMount: planId !== null });

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
      // The person chose it (or accepted the suggestion): that is the confirmation.
      steps: plan.steps.map((s) => (s.n === step.n ? { ...s, usesAgentId: agentId, usesAgentName: name, agentConfirmed: true } : s)),
    };
    setPlan(next);
    try {
      await savePlanChanges(planId, next);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The choice could not be saved.");
    }
  }

  async function changeStep(stepN: number, patch: Partial<SystemPlanStep>, errorText: string) {
    if (!plan || !planId) return;
    const next: SystemPlan = { ...plan, steps: plan.steps.map((s) => (s.n === stepN ? { ...s, ...patch } : s)) };
    setPlan(next);
    try {
      await savePlanChanges(planId, next);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : errorText);
    }
  }

  async function clearAgent(step: SystemPlanStep) {
    if (!plan || !planId) return;
    const next: SystemPlan = {
      ...plan,
      steps: plan.steps.map((s) => (s.n === step.n ? { ...s, usesAgentId: null, usesAgentName: null, agentConfirmed: false } : s)),
    };
    setPlan(next);
    try {
      await savePlanChanges(planId, next);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The change could not be saved.");
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
  const others = plan ? otherSteps(plan) : { code: 0, person: 0 };
  const allBuilt = progress.total > 0 && progress.built === progress.total;
  const nextStepN = plan?.steps.find((s) => needsAgent(s) && !s.usesAgentId)?.n ?? null;
  const agentById = new Map<string, (typeof myAgents)[number]>(myAgents.map((a) => [a.id, a]));

  if (!plan && !loadingPlan) {
    return (
      <StudioStage
        title="Orchestra Studio"
        headline="What job should this system do, every time?"
        onBack={() => router.push("/agents/new")}
        testId="orchestra-studio-start"
      >
        <div className="mt-6 flex flex-col gap-3">
          <ProTextarea
            appearance="hero"
            aria-label="What job should this system do, every time?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Every week I teach a new chapter of AP Biology. Given the chapter, write a quiz that checks real understanding…"
            minHeight={128}
            maxHeight={360}
            autoGrow
            autoFocus
            surfaceName="orchestra-studio:start"
            onSubmit={() => void plan_it()}
            submitLabel="Plan it"
            submitText="Plan it"
            submitIcon={<Workflow className="h-4 w-4" />}
            submitDisabled={description.trim().length === 0}
            isSubmitting={running}
            submitOnCmdEnter
            disabled={running}
          />
          {failure ? (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 type-secondary text-foreground" data-testid="orchestra-plan-error">
              The plan could not be made. {failure}
              <ErrorAlchemyMenu error={failure} />
            </div>
          ) : null}
        </div>

        {saved && saved.length > 0 ? (
          <section aria-label="Your plans" className="mt-12 flex flex-col gap-2">
            <h2 className="type-label px-1">Your plans</h2>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {saved.map((p) => (
                <Tile
                  key={p.id}
                  variant="quiet"
                  icon={<Network />}
                  title={p.title}
                  line={`${p.stepCount} steps`}
                  data-testid="saved-plan"
                  onClick={() => router.push(`/agents/orchestra-studio?plan=${p.id}`)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </StudioStage>
    );
  }

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
                  {progress.built} of {progress.total}<span className="hidden sm:inline"> agent steps have an agent</span><span className="sm:hidden"> built</span>
                  {others.code + others.person > 0 ? (
                    <span className="hidden text-muted-foreground md:inline">
                      {" · "}
                      {[others.code ? `${others.code} code` : "", others.person ? `${others.person} by a person` : ""].filter(Boolean).join(" and ")}
                    </span>
                  ) : null}
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
                    variant={allBuilt ? "primary" : "outline"}
                    type="button"
                    disabled={!allBuilt || Boolean(makingStep)}
                    onClick={turnIntoOrchestra}
                    data-testid="turn-into-orchestra"
                    title={allBuilt ? undefined : "Every agent step needs an agent first"}
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
              {plan.recommendation ? <p className="type-body text-muted-foreground" data-testid="plan-summary">{plan.recommendation}</p> : null}
              {plan.steps.length > 0 ? (
                <ol className="space-y-2" aria-label="Plan steps">
                  {plan.steps.map((step) => {
                    const assigned = step.usesAgentId ? agentById.get(step.usesAgentId) : undefined;
                    return (
                      <StepRow
                        key={step.n}
                        step={step}
                        href={studioHrefForStep(plan, step, planId)}
                        info={step.usesAgentId ? agentInfo.get(step.usesAgentId) : undefined}
                        match={needsAgent(step) && !step.usesAgentId ? matchStep(step, myAgents) : null}
                        fit={assigned ? fitScore(step, assigned) : null}
                        isNext={step.n === nextStepN}
                        onUseAgent={(id) => chooseAgent(step, id)}
                        onConfirm={() => changeStep(step.n, { agentConfirmed: true }, "The choice could not be saved.")}
                        onClear={() => clearAgent(step)}
                        onNote={(field, text) => changeStep(step.n, { [field]: text || null }, "The note could not be saved.")}
                      />
                    );
                  })}
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
          ) : null}
        </div>
      </div>
    </>
  );
}
