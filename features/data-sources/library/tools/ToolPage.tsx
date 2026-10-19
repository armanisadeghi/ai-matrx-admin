"use client";

/**
 * One Tool, ready to try — the friendly form on the left, the answer on the right. Champion for the
 * box: the Google Images "Tools" bar (one box, options behind one press) generated from the Tool's
 * own declaration by `SimpleBoxForm`. The run is a durable call record (`/tools/calls`): inputs are
 * written before anything runs, a slow source keeps going if the tab closes, and `?call=` picks the
 * same answer up again. No price, run count or success rate on the page: points show only at the step that
 * confirms a spend. "Advanced" opens every option as JSON; "Describe what you want" fills the form from words.
 */

import { createElement, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SimpleBoxForm } from "@ai-matrx/chat/mandates/invoke/SimpleBoxForm";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { CATALOG_SEARCH_PATH, type CatalogSearchResponse, type CatalogToolHit, type ToolCallView } from "@ai-matrx/agents/tools";

import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getJson } from "@/lib/python-client";

import { GiveToAgentDialog } from "./GiveToAgentDialog";
import { ToolResult } from "./ToolResult";
import { KeepInCrm, AddressStatus } from "./people/KeepInCrm";
import { checkedPhone, emailVerdictWords, kindOf, nextSteps, type NextStep } from "./people/lookupPlan";
import { FollowUpCard, NextSteps, type FollowUp } from "./people/ToolFollowUps";
import { inputsToSend, jobFamilyOf, memberSummary, refillFor } from "./toolFacts";
import { AdminToolLayer } from "@/features/admin/tool-layer";
import { ToolAdvanced } from "./ToolAdvanced";
import { ToolDescribe } from "./ToolDescribe";
import { ToolsAdminSlot, useToolsAdminView } from "./ToolsAdminSlot";
import { useToolCall } from "./useToolCall";
import { useToolRunForm } from "./useToolRunForm";

const draftKey = (userId: string, toolId: string) => `tools-home:draft:${userId}:${toolId}`;

function readDraft(userId: string, toolId: string): Record<string, unknown> {
  try {
    const raw = window.sessionStorage.getItem(draftKey(userId, toolId));
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
const callInputsKey = (userId: string, callId: string) => `tools-home:call-inputs:${userId}:${callId}`;
function readCallInputs(userId: string, callId: string): Record<string, unknown> {
  try {
    const raw = window.sessionStorage.getItem(callInputsKey(userId, callId));
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
function writeCallInputs(userId: string, callId: string, values: Record<string, unknown>) {
  try {
    window.sessionStorage.setItem(callInputsKey(userId, callId), JSON.stringify(values));
  } catch {
    // Private window or full storage: the box just stays empty after a reload.
  }
}

function writeDraft(userId: string, toolId: string, values: Record<string, unknown>) {
  try {
    window.sessionStorage.setItem(draftKey(userId, toolId), JSON.stringify(values));
  } catch {
    // Private window or full storage: the form still works, the draft just isn't kept.
  }
}

/** `?with=` is a small JSON object of text inputs; anything else is ignored, never trusted. */
function readWith(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string"));
  } catch {
    return {};
  }
}

function applyValues(prev: Record<string, unknown>, applied: Record<string, unknown>, userId: string | null | undefined, toolId: string): Record<string, unknown> {
  const next = { ...prev, ...applied };
  if (userId) writeDraft(userId, toolId, next);
  return next;
}

export function ToolPage({
  toolId,
  known,
  callId,
  onBack,
}: {
  toolId: string;
  /** The card the person pressed, when they came from the grid. */
  known: CatalogToolHit | null;
  callId: string | null;
  onBack: () => void;
}) {
  const params = useSearchParams();
  const userId = useAppSelector(selectUserId);
  // A deep link or a reload has no card: the card's own facts (family, reliability, speed) come by id.
  const lookup = useQuery({
    queryKey: ["tools", "hit", toolId],
    enabled: !known,
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { data } = await getJson<CatalogSearchResponse>(`${CATALOG_SEARCH_PATH}?ids=${encodeURIComponent(toolId)}`, { signal });
      return data.tools[0] ?? null;
    },
  });
  const card: CatalogToolHit | null = known ?? lookup.data ?? null;
  const form = useToolRunForm(toolId);
  const facts = form.data?.facts ?? null;
  // The card the person pressed carries reliability and speed; a deep link has only the run-form's facts.
  const title = card?.display_name ?? facts?.displayName ?? "Tool";
  const rawSummary = card?.summary ?? facts?.summary ?? "";
  const noun = card?.display_noun ?? facts?.displayNoun ?? "";
  const adminView = useToolsAdminView();
  const { text: summary, flagged } = memberSummary(rawSummary, adminView);

  // `?with=` fills the box (a lookup started from the one search box) and `&run=1` presses it once.
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    if (typeof window === "undefined" || !userId) return {};
    // A stored call page starts with an empty box: the typed draft belongs to a different question than the answer shown.
    return { ...(callId ? readCallInputs(userId, callId) : readDraft(userId, toolId)), ...readWith(params.get("with")) };
  });
  const [giving, setGiving] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followViews, setFollowViews] = useState<Record<string, ToolCallView | null>>({});
  const autoRan = useRef(false);

  // Defaults fill what the person left alone, once the form arrives.
  const inputs = form.data?.schema.inputs ?? [];
  const merged: Record<string, unknown> = {};
  for (const input of inputs) merged[input.name] = values[input.name] ?? input.default ?? "";

  // The URL may name the Tool by its job ("company_profile"); every call goes by the Tool's id.
  const realToolId = facts?.toolId || toolId;

  const pin = (nextCallId: string | null) => {
    const next = new URLSearchParams(params.toString());
    next.set("tool", toolId);
    next.delete("with");
    next.delete("run");
    if (nextCallId) next.set("call", nextCallId);
    else next.delete("call");
    replaceAddressWithoutNavigating(`${window.location.pathname}?${next.toString()}`);
  };

  const call = useToolCall(realToolId, (id) => {
    // What was asked is kept with the call, so a reload refills the box and the save knows who it was about.
    if (userId) writeCallInputs(userId, id, merged);
    pin(id);
  });
  const view = call.view;

  const run = (overrides: Record<string, unknown> = {}, spendApprovalId?: string) => {
    setFollowUps([]);
    setFollowViews({});
    return call.run(merged, overrides, spendApprovalId);
  };

  // `?call=` picks a call up again after a reload or a closed tab: same record, no new spend.
  useEffect(() => {
    if (callId) call.resume(callId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // A lookup started from the search box: one press, made once, when the form is ready.
  useEffect(() => {
    if (autoRan.current || callId || !form.data || params.get("run") !== "1") return;
    autoRan.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data, callId]);

  // A stored call page refills the form with what that call was asked (once, from its own inputs).
  const refilled = useRef<string | null>(null);
  useEffect(() => {
    const inputs = refillFor(callId, view, refilled.current);
    if (!callId || !inputs) return;
    refilled.current = callId;
    setValues(inputs);
  }, [callId, view]);

  const stop = call.stop;
  const clientError = call.clientError;

  const startedKeys = new Set(followUps.map((f) => `${f.jobKey}:${JSON.stringify(f.inputs)}`));
  const pickStep = (step: NextStep) =>
    setFollowUps((prev) => [...prev, { id: `${step.jobKey}:${prev.length}`, jobKey: step.jobKey, inputs: step.inputs }]);
  const settleFollow = (id: string, next: ToolCallView | null) => setFollowViews((prev) => (prev[id] === next ? prev : { ...prev, [id]: next }));

  // The address an email check confirmed for this answer, if one has.
  const answerEmail = kindOf(view?.output) === "work_email" ? String((view?.output as Record<string, unknown>).email ?? "") : "";
  const confirmed = Object.values(followViews).find((v) => {
    if (v?.status !== "succeeded" || emailVerdictWords(v.output)?.tone !== "good") return false;
    return String((v.output as Record<string, unknown>).email ?? "").toLowerCase() === answerEmail.toLowerCase();
  });
  const confirmedEmail = confirmed ? answerEmail : null;
  // The number a phone check found real, if one ran under this answer.
  const confirmedPhone = Object.values(followViews).map((v) => (v?.status === "succeeded" ? checkedPhone(v.output) : null)).find(Boolean) ?? null;
  const verdictView = Object.values(followViews).find((v) => v?.status === "succeeded" && kindOf(v.output) === "email_verdict" && String((v.output as Record<string, unknown>).email ?? "").toLowerCase() === answerEmail.toLowerCase());

  const family = jobFamilyOf(card?.job_family);
  const approval = view?.status === "needs_approval" ? (view.approval as ScreenRunApproval | null) : null;
  const running = view != null && (view.status === "queued" || view.status === "running" || view.status === "waiting");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12 pt-4" data-tool-page={toolId}>
      <ToolsAdminSlot where="tool" toolId={realToolId}>
        <AdminToolLayer toolId={realToolId} />
      </ToolsAdminSlot>
      <div className="flex items-center gap-2">
        <Button variant="quiet" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>
          All Tools
        </Button>
        {form.data ? (
          <Button
            variant="outline"
            className="ml-auto"
            onClick={() => setGiving(true)}
            icon={createElement(AGENT_ICON, { className: "h-4 w-4" })}
          >
            Give to an agent
          </Button>
        ) : null}
      </div>

      <section className="flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
          {createElement(family.icon, { className: "h-6 w-6" })}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {summary ? <p className="mt-1 text-sm text-muted-foreground">{summary}</p> : null}
          {form.data ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {noun ? <Badge tone="neutral">{noun}</Badge> : null}
              {facts?.offNotice ? <Badge tone="warning">Paused</Badge> : flagged ? <Badge tone="warning">May not work right now</Badge> : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
          {facts?.offNotice ? <p className="mb-3 text-sm text-muted-foreground" data-tool-off="">{facts.offNotice}</p> : null}
          {form.isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          ) : form.error || !form.data ? (
            <ReadFailure error={form.error} what="this Tool's form" onRetry={() => void form.refetch()} />
          ) : (
            <SimpleBoxForm
              inputs={form.data.schema.inputs}
              values={merged}
              onChange={(name, value) =>
                setValues((prev) => {
                  const next = { ...prev, [name]: value };
                  if (userId) writeDraft(userId, toolId, next);
                  return next;
                })
              }
              onSubmit={(overrides) => void run(overrides)}
              submitting={running}
              hints={form.data.schema.hints}
              size="standard"
              autoFocus
            />
          )}
          {form.data ? (
            <div className="mt-3 flex flex-col gap-2">
              <ToolDescribe
                toolId={realToolId}
                current={inputsToSend(merged)}
                names={inputs.map((i) => i.name)}
                onFill={(filled) => setValues((prev) => applyValues(prev, filled, userId, toolId))}
              />
              <ToolAdvanced
                names={inputs.map((i) => i.name)}
                current={inputsToSend(merged)}
                onApply={(applied) => setValues((prev) => applyValues(prev, applied, userId, toolId))}
              />
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-3">
            <ToolResult view={view} jobFamily={card?.job_family ?? null} adminView={adminView} clientError={clientError} onRunAgain={() => void run()} onCancel={stop} onReopen={call.reopen} />
            {view?.status === "succeeded" ? (
              <>
                <AddressStatus output={view.output} verdict={verdictView?.output} />
                <KeepInCrm output={view.output} inputs={merged} confirmedEmail={confirmedEmail} confirmedPhone={confirmedPhone} />
                <NextSteps steps={nextSteps(view.output)} started={startedKeys} onPick={pickStep} />
              </>
            ) : null}
            {followUps.map((f) => (
              <FollowUpCard key={f.id} followUp={f} onView={settleFollow} />
            ))}
          </div>
        </div>
      </div>

      {approval ? (
        <ToolActionApprovalDialog
          approval={approval}
          onSettled={(answer) => {
            if (answer.spendApprovalId) void run({}, answer.spendApprovalId);
            else call.clear();
          }}
        />
      ) : null}
      {giving ? <GiveToAgentDialog toolId={realToolId} toolName={title} onClose={() => setGiving(false)} /> : null}
    </div>
  );
}
