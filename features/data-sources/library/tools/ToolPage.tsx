"use client";

/**
 * One Tool, ready to try — the friendly form on the left, the answer on the right. Champion for the
 * box: the Google Images "Tools" bar (one box, options behind one press) generated from the Tool's
 * own declaration by `SimpleBoxForm`. The run is a durable call record (`/tools/calls`): inputs are
 * written before anything runs, a slow source keeps going if the tab closes, and `?call=` picks the
 * same answer up again. Beaten by showing the price before the press and the real cost after it.
 */

import { createElement, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import { SimpleBoxForm } from "@ai-matrx/chat/mandates/invoke/SimpleBoxForm";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { cancelHostToolCall, resumeHostToolCall, runHostToolCall } from "@ai-matrx/chat/agents/identity/tool-calls";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { CATALOG_SEARCH_PATH, newToolCallKey, toolPriceText, type CatalogSearchResponse, type CatalogToolHit, type ToolCallView } from "@ai-matrx/agents/tools";

import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getJson } from "@/lib/python-client";
import { extractErrorMessage } from "@/utils/errors";

import { GiveToAgentDialog } from "./GiveToAgentDialog";
import { ToolResult } from "./ToolResult";
import { inputsToSend, jobFamilyOf, reliabilityFacts, speedText } from "./toolFacts";
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
function writeDraft(userId: string, toolId: string, values: Record<string, unknown>) {
  try {
    window.sessionStorage.setItem(draftKey(userId, toolId), JSON.stringify(values));
  } catch {
    // Private window or full storage: the form still works, the draft just isn't kept.
  }
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
  const summary = card?.summary ?? facts?.summary ?? "";
  const noun = card?.display_noun ?? facts?.displayNoun ?? "";
  const priceHint = card?.price_hint_points ?? facts?.priceHintPoints ?? null;

  const [values, setValues] = useState<Record<string, unknown>>(() => (typeof window === "undefined" || !userId ? {} : readDraft(userId, toolId)));
  const [view, setView] = useState<ToolCallView | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [giving, setGiving] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const resumed = useRef<string | null>(null);

  // Defaults fill what the person left alone, once the form arrives.
  const inputs = form.data?.schema.inputs ?? [];
  const merged: Record<string, unknown> = {};
  for (const input of inputs) merged[input.name] = values[input.name] ?? input.default ?? "";

  useEffect(() => () => abort.current?.abort(), []);

  const pin = (nextCallId: string | null) => {
    const next = new URLSearchParams(params.toString());
    next.set("tool", toolId);
    if (nextCallId) next.set("call", nextCallId);
    else next.delete("call");
    replaceAddressWithoutNavigating(`${window.location.pathname}?${next.toString()}`);
  };

  const run = async (overrides: Record<string, unknown> = {}, spendApprovalId?: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setClientError(null);
    const send = inputsToSend({ ...merged, ...overrides });
    try {
      const done = await runHostToolCall({
        request: {
          tool_id: toolId,
          inputs: send,
          idempotency_key: newToolCallKey(),
          cache_policy: "prefer",
          spend_approval_id: spendApprovalId ?? null,
          wait_s: 25,
        },
        signal: controller.signal,
        onUpdate: (next) => {
          setView(next);
          if (next.call_id && resumed.current !== next.call_id) {
            // Pinned once, and marked as ours so the resume effect below does not read it again.
            resumed.current = next.call_id;
            pin(next.call_id);
          }
        },
      });
      setView(done);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setClientError(extractErrorMessage(cause, "The Tool could not be reached. Nothing was charged."));
    }
  };

  // `?call=` picks a call up again after a reload or a closed tab: same record, no new spend.
  useEffect(() => {
    if (!callId || resumed.current === callId) return;
    resumed.current = callId;
    const controller = new AbortController();
    abort.current = controller;
    resumeHostToolCall(callId, { signal: controller.signal, onUpdate: setView }).then(setView, (cause: unknown) => {
      if (!controller.signal.aborted) setClientError(extractErrorMessage(cause, "That answer could not be opened."));
    });
  }, [callId]);

  const stop = () => {
    if (view?.call_id) void cancelHostToolCall(view.call_id).then(setView, () => undefined);
  };

  const family = jobFamilyOf(card?.job_family);
  const price = toolPriceText({ price_hint_points: priceHint });
  const reliability = card ? reliabilityFacts(card.reliability) : null;
  const speed = card ? speedText(card.reliability.p50_ms) : null;
  const approval = view?.status === "needs_approval" ? (view.approval as ScreenRunApproval | null) : null;
  const running = view != null && (view.status === "queued" || view.status === "running" || view.status === "waiting");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12 pt-4" data-tool-page={toolId}>
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
              {facts?.offNotice ? <Badge tone="warning">Paused</Badge> : null}
              {price ? <span className="font-medium text-foreground">{price}</span> : null}
              {reliability ? (
                <span>
                  {reliability.headline}
                  {reliability.sample ? ` · ${reliability.sample}` : ""}
                </span>
              ) : null}
              {speed ? (
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" aria-hidden />
                  {speed}
                </span>
              ) : null}
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
        </div>
        <div className="min-w-0">
          <ToolResult view={view} clientError={clientError} onRunAgain={() => void run()} onCancel={stop} />
        </div>
      </div>

      {approval ? (
        <ToolActionApprovalDialog
          approval={approval}
          onSettled={(answer) => {
            if (answer.spendApprovalId) void run({}, answer.spendApprovalId);
            else setView(null);
          }}
        />
      ) : null}
      {giving ? <GiveToAgentDialog toolId={toolId} toolName={title} onClose={() => setGiving(false)} /> : null}
    </div>
  );
}
