"use client";

/**
 * Look up (lane L12c): ask about an account, a topic, ads or a post's comments in one box, see each
 * answer as its kind with its cost in points, and keep rows in a table. Every answer is a catalog
 * Tool run through `/tools/calls` (the same call layer, price and ledger as the Tools home); the
 * friendly box is the Tool's own declaration drawn by the shared `SimpleBoxForm`. A source the
 * catalog does not carry says so in words.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { requestRichContentHost, useRichContentHostLanded } from "@ai-matrx/rich-content/host";
import { componentRegistry } from "@/features/content-ir/registry/component-registry";
import { SearchX } from "lucide-react";
import { SimpleBoxForm } from "@ai-matrx/chat/mandates/invoke/SimpleBoxForm";
import { planSimpleBox } from "@ai-matrx/chat/mandates/invoke/simple-box";
import { Chip, EmptyState, RegionSkeleton, Tabs } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { newToolCallKey, type ToolCallView } from "@ai-matrx/agents/tools";

import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useToolRunForm } from "@/features/data-sources/library/tools/useToolRunForm";

import { PlatformMark } from "../components/PlatformMark";
import { ResearchStepCard } from "./ResearchStepCard";
import {
  ACCOUNT_SOURCES,
  AD_SOURCES,
  DEFAULT_ACCOUNT_SOURCE,
  DEFAULT_AD_SOURCE,
  RESEARCH_MODES,
  UNSERVED_SOURCES,
  chipForPaste,
  decodeCalls,
  encodeCalls,
  isResearchMode,
  sourceFor,
  stepInputs,
  stepsServed,
  unservedFor,
  type ResearchMode,
  type ResearchSource,
} from "./sources";
import { useResearchTools } from "./useResearchTools";

interface Submission {
  key: string;
  /** Per served step, in order: the inputs it was sent. */
  inputs: Array<Record<string, unknown>>;
}

const RUNNING = new Set(["queued", "running", "waiting"]);

export function ResearchTab() {
  const params = useSearchParams();
  const tools = useResearchTools();

  // The answers draw as kinds. The kind registry's database tiers are registered by the lazily loaded rich-content
  // host, and a kind drawn before they are read settles on the universal viewer for good; so the host is requested
  // the moment the screen opens (the person is still typing) and the component rows are read once it lands.
  const hostLanded = useRichContentHostLanded();
  useEffect(() => {
    requestRichContentHost();
  }, []);
  useEffect(() => {
    if (hostLanded) void componentRegistry.refreshKindComponents(0);
  }, [hostLanded]);

  const initialMode = params.get("mode");
  const [mode, setMode] = useState<ResearchMode>(isResearchMode(initialMode) ? initialMode : "account");
  const [sourceId, setSourceId] = useState<string>(params.get("source") ?? (initialMode === "ads" ? DEFAULT_AD_SOURCE : DEFAULT_ACCOUNT_SOURCE));
  const source = sourceFor(mode, sourceId);
  const unserved = mode === "account" ? unservedFor(sourceId) : null;

  const found = useMemo(() => tools.data ?? new Map(), [tools.data]);
  const { served, missing } = source ? stepsServed(source, found) : { served: [], missing: [] };
  const formTool = source ? found.get(source.formJob) : undefined;
  const form = useToolRunForm(formTool?.tool_id ?? null);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const typed = useRef("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [views, setViews] = useState<Record<string, ToolCallView | null>>({});
  const [savedCalls, setSavedCalls] = useState<Array<string | null>>(() => decodeCalls(params.get("calls"), 4));
  const callIds = useRef<Array<string | null>>(savedCalls);

  // The form of the source in front: its primary box carries what was typed over from the last one.
  const inputs = useMemo(
    () => (form.data?.schema.inputs ?? []).filter((i) => !source?.hide.includes(i.name) && !(source && i.name in source.fixed)),
    [form.data, source],
  );
  const primaryName = useMemo(() => planSimpleBox(inputs).primary?.name ?? null, [inputs]);
  useEffect(() => {
    setValues(primaryName && typed.current ? { [primaryName]: typed.current } : {});
  }, [primaryName, formTool?.tool_id]);

  const merged: Record<string, unknown> = {};
  for (const input of inputs) merged[input.name] = values[input.name] ?? input.default ?? "";

  const pinAddress = (next: { mode: ResearchMode; source: string; calls: Array<string | null> | null }) => {
    const query = new URLSearchParams(params.toString());
    query.set("mode", next.mode);
    if (next.mode === "account" || next.mode === "ads") query.set("source", next.source);
    else query.delete("source");
    if (next.calls && next.calls.some(Boolean)) query.set("calls", encodeCalls(next.calls));
    else query.delete("calls");
    replaceAddressWithoutNavigating(`${window.location.pathname}?${query.toString()}`);
  };

  const defaultSourceOf = (m: ResearchMode) => (m === "ads" ? DEFAULT_AD_SOURCE : DEFAULT_ACCOUNT_SOURCE);
  const choose = (nextMode: ResearchMode, nextSource: string) => {
    setMode(nextMode);
    setSourceId(nextSource);
    setSubmission(null);
    setSavedCalls([]);
    callIds.current = [];
    setViews({});
    pinAddress({ mode: nextMode, source: nextSource, calls: null });
  };

  const submit = (overrides: Record<string, unknown>) => {
    if (!source || served.length === 0) return;
    const all = { ...merged, ...overrides, ...source.fixed };
    callIds.current = [];
    setSavedCalls([]);
    setViews({});
    setSubmission({ key: newToolCallKey(), inputs: served.map((step) => stepInputs(step, all)) });
    pinAddress({ mode, source: sourceId, calls: null });
  };

  const onChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (name !== primaryName || typeof value !== "string") return;
    typed.current = value;
    const chip = mode === "account" && source?.region === "west" ? chipForPaste(value) : null;
    if (chip && chip !== sourceId) {
      setSourceId(chip);
      pinAddress({ mode, source: chip, calls: null });
    }
  };

  const reportCall = (index: number, id: string) => {
    callIds.current = Object.assign([], callIds.current, { [index]: id });
    pinAddress({ mode, source: sourceId, calls: callIds.current });
  };

  const settled = served.length > 0 && served.every((step) => {
    const view = views[step.id];
    return view != null && !RUNNING.has(view.status);
  });
  const showResults = served.length > 0 && (submission != null || savedCalls.some(Boolean));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5" data-social-research="">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="min-w-0 overflow-x-auto">
          <Tabs
            aria-label="What to look up"
            variant="capsule"
            value={mode}
            data={RESEARCH_MODES.map((m) => ({ value: m.id, label: m.label }))}
            onValueChange={(v) => choose(v as ResearchMode, defaultSourceOf(v as ResearchMode))}
          />
        </div>
        {mode === "account" ? <PlatformChips value={sourceId} onChange={(id) => choose("account", id)} /> : null}
        {mode === "ads" ? <AdLibraryChips value={source?.id ?? DEFAULT_AD_SOURCE} onChange={(id) => choose("ads", id)} /> : null}
        {tools.isLoading ? (
          <RegionSkeleton />
        ) : tools.error ? (
          <ReadFailure error={tools.error} what="the Tools for looking things up" onRetry={() => void tools.refetch()} />
        ) : unserved ? null : !source || !formTool ? (
          <EmptyState icon={<SearchX className="h-5 w-5" />} title="Not available yet" line={`${source?.label ?? "This source"} isn't available right now.`} />
        ) : form.isLoading ? (
          <RegionSkeleton />
        ) : form.error || !form.data ? (
          <ReadFailure error={form.error} what="this form" onRetry={() => void form.refetch()} />
        ) : (
          <SimpleBoxForm
            inputs={inputs}
            values={merged}
            onChange={onChange}
            onSubmit={submit}
            submitting={submission != null && !settled}
            hints={source.submit ? { ...form.data.schema.hints, submitLabel: source.submit } : form.data.schema.hints}
            size="standard"
            autoFocus
            footer={<MissingLine missing={missing.map((m) => m.title)} />}
          />
        )}
      </div>

      {unserved ? <EmptyState icon={<SearchX className="h-5 w-5" />} title={`${unserved.label} isn't available right now`} line={unserved.words} /> : null}

      {showResults ? (
        <div className={served.length > 1 ? "grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]" : "flex flex-col gap-5"}>
          {served.map((step, index) => (
            <ResearchStepCard
              key={`${sourceId}:${mode}:${step.id}`}
              toolId={step.toolId}
              title={step.title}
              submission={submission ? { key: submission.key, inputs: submission.inputs[index] ?? {} } : null}
              callId={savedCalls[index] ?? null}
              onCall={(id) => reportCall(index, id)}
              onView={(view) => setViews((prev) => (prev[step.id] === view ? prev : { ...prev, [step.id]: view }))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlatformChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const chip = (id: string, label: string) => (
    <Chip key={id} asChild label={label} pressed={id === value} icon={<PlatformMark platform={id} size={14} />}>
      <button type="button" onClick={() => onChange(id)} />
    </Chip>
  );
  const west: readonly ResearchSource[] = ACCOUNT_SOURCES.filter((s) => s.region === "west");
  const china: readonly ResearchSource[] = ACCOUNT_SOURCES.filter((s) => s.region === "china");
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Platforms">
        {west.map((s) => chip(s.id, s.label))}
      </div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Chinese platforms">
        {china.map((s) => chip(s.id, s.label))}
        {UNSERVED_SOURCES.map((s) => chip(s.id, s.label))}
      </div>
    </div>
  );
}

function AdLibraryChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Ad libraries">
      {AD_SOURCES.map((s) => (
        <Chip key={s.id} asChild label={s.label} pressed={s.id === value} icon={s.id === "google" ? undefined : <PlatformMark platform={s.id === "meta" ? "facebook" : s.id} size={14} />}>
          <button type="button" onClick={() => onChange(s.id)} />
        </Chip>
      ))}
    </div>
  );
}

function MissingLine({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  return (
    <p className="type-secondary text-muted-foreground" data-research-missing="">
      {`${missing.join(" and ")} not available yet`}
    </p>
  );
}
