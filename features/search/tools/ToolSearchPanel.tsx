"use client";

/**
 * The search page's catalog tabs: Deep, Reviews, AI answers (third-party services lane L12d).
 *
 * One box and a button, generated from the Tool's own declaration by `SimpleBoxForm`, run as a durable
 * call record (`/tools/calls`) so a slow source keeps going if the tab closes and `?call=` opens the
 * same answer again. The answer is drawn by its kind with what it cost in points, and "Keep these rows"
 * saves it to a table (`ToolResult`, the Tools home's own viewer — never a second one). Champion: the
 * Google Images Tools bar, beaten by showing the price before the press and the real cost after it.
 */

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { SimpleBoxForm } from "@ai-matrx/chat/mandates/invoke/SimpleBoxForm";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { Tabs } from "@ai-matrx/design-system/controls";
import { toolPriceText } from "@ai-matrx/agents/tools";

import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { ToolResult } from "@/features/data-sources/library/tools/ToolResult";
import { useToolCall } from "@/features/data-sources/library/tools/useToolCall";
import { useToolRunForm, type ToolRunForm } from "@/features/data-sources/library/tools/useToolRunForm";
import { adaptInputs, detectReviewLane, laneOf, TOOL_LANES, type ToolLane, type ToolTab } from "./searchToolPlan";

type FormQuery = ReturnType<typeof useToolRunForm>;

/** The first live Tool of the lane's job; while none is, the first one that answers at all. */
function pickTool(lane: ToolLane, forms: readonly FormQuery[]): { jobKey: string; form: ToolRunForm } | "loading" | null {
  const answered = forms.flatMap((q, i) => (q.data ? [{ jobKey: lane.jobKeys[i] as string, form: q.data }] : []));
  const live = answered.find((a) => a.form.facts.state === "live");
  if (live) return live;
  if (forms.some((q) => q.isLoading)) return "loading";
  return answered[0] ?? null;
}

function LaneBox({
  lane,
  seed,
  callId,
  onTyped,
  onPinned,
}: {
  lane: ToolLane;
  seed: string;
  callId: string | null;
  /** The primary box changed: what the person typed, as typed. */
  onTyped: (value: string) => void;
  onPinned: (callId: string) => void;
}) {
  // A lane has at most two Tools while the catalog fills in; the hooks are fixed, the keys are data.
  const first = useToolRunForm(lane.jobKeys[0] ?? null);
  const second = useToolRunForm(lane.jobKeys[1] ?? null);
  const picked = pickTool(lane, [first, second]);
  const form = picked && picked !== "loading" ? picked.form : null;
  const jobKey = picked && picked !== "loading" ? picked.jobKey : "";

  const [values, setValues] = useState<Record<string, unknown>>({});
  const inputs = form?.schema.inputs ?? [];
  const primary = inputs.find((i) => i.primary) ?? inputs.find((i) => i.required) ?? inputs[0];

  // The words already in the search box fill this Tool's box until the person types in it.
  const merged: Record<string, unknown> = {};
  for (const input of inputs) {
    const fallback = input === primary && seed ? seed : (input.default ?? "");
    merged[input.name] = values[input.name] ?? fallback;
  }

  const call = useToolCall(form?.facts.toolId ?? "", onPinned);
  const { view } = call;
  useEffect(() => {
    if (callId && form) call.resume(callId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, form?.facts.toolId]);

  const run = (overrides: Record<string, unknown> = {}, spendApprovalId?: string) =>
    call.run(adaptInputs(jobKey, merged), adaptInputs(jobKey, overrides), spendApprovalId);

  if (picked === "loading") return <div className="h-14 animate-pulse rounded-full bg-muted" aria-busy />;
  if (!form || !picked) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center" data-tool-unavailable="">
        <SearchX className="h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{`${lane.label} isn't available right now.`}</p>
      </div>
    );
  }

  const approval = view?.status === "needs_approval" ? (view.approval as ScreenRunApproval | null) : null;
  const running = view != null && (view.status === "queued" || view.status === "running" || view.status === "waiting");
  const price = toolPriceText({ price_hint_points: form.facts.priceHintPoints });

  return (
    <div className="flex flex-col gap-5" data-tool-lane={lane.id} data-tool-job={jobKey}>
      {form.facts.offNotice ? (
        <p className="text-sm text-muted-foreground" data-tool-off="">
          {form.facts.offNotice}
        </p>
      ) : null}
      <SimpleBoxForm
        inputs={inputs}
        values={merged}
        onChange={(name, value) => {
          setValues((prev) => ({ ...prev, [name]: value }));
          if (name === primary?.name && typeof value === "string") onTyped(value);
        }}
        onSubmit={(overrides) => void run(overrides)}
        submitting={running}
        hints={form.schema.hints}
        submitLabel={form.facts.submitLabel || undefined}
        size="standard"
        autoFocus
        footer={price ? <span className="text-xs text-muted-foreground" data-tool-price="">{price}</span> : undefined}
      />
      {view || call.clientError ? (
        <ToolResult view={view} clientError={call.clientError} onRunAgain={() => void run()} onCancel={call.stop} />
      ) : null}
      {approval ? (
        <ToolActionApprovalDialog
          approval={approval}
          onSettled={(answer) => {
            if (answer.spendApprovalId) void run({}, answer.spendApprovalId);
            else call.clear();
          }}
        />
      ) : null}
    </div>
  );
}

export function ToolSearchPanel({ tab, seed }: { tab: ToolTab; seed: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const lanes = TOOL_LANES[tab];
  const [laneId, setLaneId] = useState(() => laneOf(tab, params.get("lane")).id);
  const [typed, setTyped] = useState(() => params.get("q") ?? seed);
  const callId = params.get("call");
  const lane = laneOf(tab, laneId);

  const write = (next: { lane?: string; q?: string; call?: string | null }) => {
    const p = new URLSearchParams(window.location.search);
    p.set("tab", tab);
    if (next.lane !== undefined) p.set("lane", next.lane);
    if (next.q !== undefined) {
      if (next.q) p.set("q", next.q);
      else p.delete("q");
    }
    if (next.call !== undefined) {
      if (next.call) p.set("call", next.call);
      else p.delete("call");
    }
    replaceAddressWithoutNavigating(`${pathname}?${p.toString()}`);
  };

  const onTyped = (value: string) => {
    setTyped(value);
    // A pasted store, map or Trustpilot link says which source it is for.
    const detected = tab === "reviews" ? detectReviewLane(value) : null;
    if (detected && detected !== laneId) {
      setLaneId(detected);
      write({ lane: detected, q: value, call: null });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5" data-tool-tab={tab}>
      {lanes.length > 1 ? (
        <Tabs
          aria-label="Where to read them"
          variant="capsule"
          className="flex-wrap"
          value={laneId}
          onValueChange={(next: string) => {
            setLaneId(next);
            write({ lane: next, q: typed, call: null });
          }}
          data={lanes.map((l) => ({ value: l.id, label: l.label }))}
        />
      ) : null}
      <LaneBox
        key={lane.id}
        lane={lane}
        seed={typed}
        callId={callId}
        onTyped={onTyped}
        onPinned={(id) => write({ lane: lane.id, q: typed, call: id })}
      />
    </div>
  );
}
