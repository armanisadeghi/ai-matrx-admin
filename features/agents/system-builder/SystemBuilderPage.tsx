"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Network, Plus, Sparkles, Wrench } from "lucide-react";
import { Button, Textarea, cn } from "@ai-matrx/design-system";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import PageHeader from "@/features/shell/components/header/PageHeader";
import MarkdownStream from "@ai-matrx/chat/ui/markdown-stream/MarkdownStream";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { supabase } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { parsePlannerAnswer, studioHrefForStep } from "./parse-plan";
import { runPlanner } from "./planner";
import { listMyPlans, loadPlan, saveNewPlan, savePlanChanges, type SavedPlanSummary } from "./plan-store";
import type { SystemPlan, SystemPlanStep } from "./types";

const DOER_LABEL: Record<SystemPlanStep["doer"], string> = {
  agent: "Agent",
  "ai-call": "AI call",
  decision: "Decision model",
  code: "Code / node",
  human: "You",
  unknown: "Step",
};

async function agentNameOf(id: string): Promise<string | null> {
  const { data } = await supabase.schema("agent").from("definition").select("name").eq("id", id).maybeSingle();
  return data?.name ?? null;
}

function StepRow({
  step,
  href,
  onUseAgent,
}: {
  step: SystemPlanStep;
  href: string;
  onUseAgent: (agentId: string) => void;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary-ink">
        {step.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="type-body font-medium text-foreground">{step.title}</span>
          {step.doer !== "unknown" ? (
            <span className="rounded-full border border-border px-2 py-0.5 type-meta text-muted-foreground">
              {DOER_LABEL[step.doer]}
            </span>
          ) : null}
          {step.modelClass ? (
            <span className="type-meta text-muted-foreground">{step.modelClass}</span>
          ) : null}
        </div>
        {step.job ? <p className="mt-1 type-secondary text-muted-foreground">{step.job}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {step.usesAgentId ? (
            <Link
              href={`/agents/${step.usesAgentId}/build`}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 type-secondary text-primary-ink"
            >
              Uses {step.usesAgentName ?? "agent"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
          <Button asChild size="sm" variant={step.usesAgentId ? "outline" : "default"}>
            <Link href={href}>
              <Wrench className="mr-1 h-3.5 w-3.5" />
              Build this agent
            </Link>
          </Button>
          <AgentListDropdown
            consumerId="system-builder-step-agent"
            activeAgentId={step.usesAgentId}
            onSelect={onUseAgent}
            showPinnedAgent={false}
            triggerSlot={
              <Button size="sm" variant="outline" type="button">
                Use existing agent
              </Button>
            }
          />
        </div>
      </div>
    </li>
  );
}

export default function SystemBuilderPage() {
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const planId = params.get("plan");

  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<SystemPlan | null>(null);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPlanSummary[] | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(planId !== null);
  const justCreated = useRef<string | null>(null);

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
    if (!planId) {
      setPlan(null);
      return;
    }
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
      const { answer, conversationId } = await runPlanner(dispatch, text);
      const parsed = parsePlannerAnswer(answer, text, conversationId);
      const id = await saveNewPlan(parsed);
      justCreated.current = id;
      setPlan(parsed);
      router.replace(`/agents/system-builder?plan=${id}`);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The plan could not be made.");
    } finally {
      setRunning(false);
    }
  }

  async function useAgent(step: SystemPlanStep, agentId: string) {
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

  return (
    <>
      <PageHeader>
        <div className="flex w-full min-w-0 items-center">
          <ChevronLeftTapButton
            onClick={() => (plan ? router.push("/agents/system-builder") : router.push("/agents/new"))}
            variant="transparent"
            ariaLabel="Back"
          />
          <Network className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="ml-2 truncate type-title text-foreground">
            {plan ? plan.title : "System Builder"}
          </span>
          <div className="ml-auto flex items-center">
            {plan ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/agents/system-builder" aria-label="New plan">
                  <Plus className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">New</span>
                </Link>
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
            </div>
          ) : null}

          {loadingPlan ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : plan ? (
            <div className="space-y-4">
              {plan.recommendation ? (
                <p className="type-body text-muted-foreground">{plan.recommendation}</p>
              ) : null}
              {plan.steps.length > 0 ? (
                <ol className="space-y-2" aria-label="Plan steps">
                  {plan.steps.map((step) => (
                    <StepRow
                      key={step.n}
                      step={step}
                      href={studioHrefForStep(plan, step, planId)}
                      onUseAgent={(id) => useAgent(step, id)}
                    />
                  ))}
                </ol>
              ) : (
                <div className="rounded-lg border border-border bg-card p-3 type-secondary text-muted-foreground">
                  No step list found in this answer. The full answer is below.
                </div>
              )}
              <details className="rounded-lg border border-border bg-card p-3" open={plan.steps.length === 0}>
                <summary className="cursor-pointer type-secondary text-muted-foreground">The Architect&apos;s full answer</summary>
                <div className="mt-2" data-message-content>
                  <MarkdownStream content={plan.answer} hideCopyButton allowFullScreenEditor={false} />
                </div>
              </details>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 pt-2">
                <h1 className="type-title text-foreground">What job should this system do, every time?</h1>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Every week I teach a new chapter of AP Biology. Given the chapter, write a quiz that checks real understanding…"
                  rows={5}
                  disabled={running}
                />
                <div className="flex items-center justify-end gap-2">
                  {running ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Planning" /> : null}
                  <Button type="button" onClick={plan_it} disabled={running || description.trim().length === 0}>
                    <Sparkles className="mr-1 h-4 w-4" />
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
                          href={`/agents/system-builder?plan=${p.id}`}
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
