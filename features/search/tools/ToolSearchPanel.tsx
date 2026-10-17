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

import { useEffect, useEffectEvent, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import { SimpleBoxForm } from "@ai-matrx/chat/mandates/invoke/SimpleBoxForm";
import { pickPrimary } from "@ai-matrx/chat/mandates/invoke/simple-box";
import type { ServedInput } from "@ai-matrx/chat/mandates/invoke/served-input";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { Button, Tabs } from "@ai-matrx/design-system/controls";
import { toolPriceText } from "@ai-matrx/agents/tools";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { ToolResult } from "@/features/data-sources/library/tools/ToolResult";
import { useToolCall } from "@/features/data-sources/library/tools/useToolCall";
import { useToolRunForm, type ToolRunForm } from "@/features/data-sources/library/tools/useToolRunForm";
import { useLaneFinder } from "./useLaneFinder";
import {
  adaptInputs,
  detectReviewLane,
  laneOf,
  needsFinder,
  TOOL_LANES,
  type ToolLane,
  type ToolTab,
} from "./searchToolPlan";

type FormQuery = ReturnType<typeof useToolRunForm>;

/** Every kind of text a box can be told it holds: a pick fits whichever the Tool wants. */
const ANY_TEXT: ServedInput["detect"] = ["handle", "url", "domain", "keyword", "email", "person_name", "phone"];

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
  const chosen = pickTool(lane, [first, second]);
  const form = chosen && chosen !== "loading" ? chosen.form : null;
  const jobKey = chosen && chosen !== "loading" ? chosen.jobKey : "";

  const [values, setValues] = useState<Record<string, unknown>>({});
  // A thing picked from the finder: the box keeps its name, the Tool is given its link or id.
  const [picked, setPicked] = useState<{ label: string; value: string } | null>(null);
  const inputs = form?.schema.inputs ?? [];
  // THE box, by the form's own rule, so the finder and the seed attach to the field the person types in.
  const primary = pickPrimary(inputs) ?? inputs[0];

  // The words already in the search box fill this Tool's box until the person types in it.
  const merged: Record<string, unknown> = {};
  for (const input of inputs) {
    const fallback = input === primary && seed ? seed : (input.default ?? "");
    merged[input.name] = values[input.name] ?? fallback;
  }

  const call = useToolCall(form?.facts.toolId ?? "", onPinned);
  const { view } = call;
  const resumeCall = useEffectEvent((id: string) => call.resume(id));
  const toolId = form?.facts.toolId;
  useEffect(() => {
    if (callId && toolId) resumeCall(callId);
  }, [callId, toolId]);

  const finder = useLaneFinder(lane.id);
  // A picked thing shows its name in the box while the Tool is given its link: the box must not say
  // "looks like a name — this wants a website" about a choice the person just made.
  const showingPick = primary != null && picked != null && String(merged[primary.name] ?? "").trim() === picked.label;
  const boxInputs = showingPick ? inputs.map((i) => (i === primary ? { ...i, detect: ANY_TEXT } : i)) : inputs;
  const run = (overrides: Record<string, unknown> = {}, spendApprovalId?: string) => {
    const typedText = primary ? String(overrides[primary.name] ?? merged[primary.name] ?? "") : "";
    // What the Tool is given: the thing picked from the finder (while the box still shows its name), else the text.
    const given = primary && picked && typedText.trim() === picked.label ? { [primary.name]: picked.value } : null;
    // A name where a link is wanted: look for it and let the person pick, instead of buying a failure.
    if (!spendApprovalId && !given && needsFinder(lane.id, typedText)) {
      call.clear();
      void finder.find(typedText.trim());
      return Promise.resolve();
    }
    finder.clear();
    return call.run(adaptInputs(jobKey, { ...merged, ...given }), adaptInputs(jobKey, { ...overrides, ...given }), spendApprovalId);
  };

  if (chosen === "loading") return <div className="h-14 animate-pulse rounded-full bg-muted" aria-busy aria-label="Loading" />;
  if (!form || !chosen) {
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
        inputs={boxInputs}
        values={merged}
        onChange={(name, value) => {
          setValues((prev) => ({ ...prev, [name]: value }));
          if (name === primary?.name && finder.state.phase !== "idle") finder.clear();
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
      {finder.state.phase !== "idle" ? (
        <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite" data-tool-finder={finder.state.phase}>
          {finder.state.phase === "looking" ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {`Looking for “${finder.state.words}”`}
            </span>
          ) : finder.state.phase === "failed" ? (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              {finder.state.message}
              <ErrorAlchemyMenu error={finder.state.message} />
            </span>
          ) : finder.state.candidates.length === 0 ? (
            <span className="text-sm text-muted-foreground">{`No match for “${finder.state.words}”. Paste its link instead.`}</span>
          ) : (
            finder.state.candidates.map((c) => (
              <Button
                key={c.value}
                variant="outline"
                data-tool-candidate=""
                onClick={() => {
                  if (!primary) return;
                  setValues((prev) => ({ ...prev, [primary.name]: c.label }));
                  setPicked({ label: c.label, value: c.value });
                  onTyped(c.label);
                  finder.clear();
                  void call.run(adaptInputs(jobKey, { ...merged, [primary.name]: c.value }), {});
                }}
              >
                {`${c.label} · ${c.caption}`}
              </Button>
            ))
          )}
        </div>
      ) : null}
      {view || call.clientError ? (
        <ToolResult
          view={view}
          clientError={call.clientError}
          onRunAgain={() => void run()}
          onCancel={call.stop}
          onReopen={call.reopen}
          showRaw={false}
        />
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
  // What the box holds: the words typed on the page, else the link's own ?q=.
  const [typed, setTyped] = useState(() => seed || params.get("q") || "");
  // A link in the box says which source it is for, even on arrival.
  const [laneId, setLaneId] = useState(() => {
    const named = params.get("lane");
    return named ? laneOf(tab, named).id : laneOf(tab, tab === "reviews" ? detectReviewLane(seed || params.get("q") || "") : null).id;
  });
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
        <div className="max-w-full overflow-x-auto scrollbar-none">
        <Tabs
          aria-label="Where to read them"
          variant="capsule"
          className="flex-nowrap"
          value={laneId}
          onValueChange={(next: string) => {
            setLaneId(next);
            write({ lane: next, q: typed, call: null });
          }}
          data={lanes.map((l) => ({ value: l.id, label: l.label }))}
        />
        </div>
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
