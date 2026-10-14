"use client";

/**
 * Review search results — the body of the window panel (and of any host that renders it inline).
 *
 * Each result renders through THE canonical `web_result` component (`SearchKindNested`, the same
 * renderer the Search Lab at /scraper/search draws) — never a second renderer. Under each result sits
 * one row of feedback controls: the "we think" suggestion (glows, never pre-selects; its reason,
 * probability and evidence open on hover), the pinned answers, "More" for the rest of the
 * vocabulary, sentiment where the answer carries it, Ask me later and Ignore.
 */

import { useState } from "react";
import { Clock, EyeOff, Lightbulb, RotateCcw, Search } from "lucide-react";
import {
  Button,
  EmptyState,
  SegmentedControl,
  Select,
  type SelectOption,
} from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SearchKindNested } from "@/components/mardown-display/blocks/search-kinds/SearchKindNested";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { searchEngineLabel } from "@/features/search/types";
import { extractErrorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";
import { resultTitle, resultUrl, toWebResultValue } from "./webResult";
import type {
  ReviewAnswer,
  ReviewChoice,
  ReviewResult,
  ReviewSentiment,
  ReviewSuggestion,
  SearchReviewSession,
} from "./types";

type View = "open" | "answered" | "later" | "all";

const SENTIMENTS: { value: ReviewSentiment; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

function bestRank(r: ReviewResult): number {
  return r.hits.length ? Math.min(...r.hits.map((h) => h.rank)) : 999;
}

function inView(answer: ReviewAnswer | undefined, view: View): boolean {
  if (view === "all") return true;
  if (view === "open") return !answer;
  if (view === "later") return answer?.status === "later";
  return answer?.status === "answered" || answer?.status === "ignored";
}

function answerLabel(answer: ReviewAnswer, choices: ReviewChoice[]): string {
  if (answer.status === "later") return "Ask me later";
  if (answer.status === "ignored") return "Ignored";
  const label = choices.find((c) => c.key === answer.kind)?.label ?? answer.kind;
  return answer.sentiment ? `${label} · ${answer.sentiment}` : label;
}

/** Grounding (hover only): why we think so, how sure, where it was found. */
function SuggestionPopover({
  suggestion,
  choice,
  onPick,
}: {
  suggestion: ReviewSuggestion;
  choice: ReviewChoice;
  onPick: () => void;
}) {
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        {/* The glow is the frame around the control, never a restyle of it. */}
        <span className="inline-flex rounded-md shadow-[0_0_14px] shadow-primary/45 ring-2 ring-primary/50">
          <Button variant="outline" icon={<Lightbulb aria-hidden />} onClick={onPick} data-testid="search-review-suggestion">
            {choice.label}
          </Button>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 space-y-1.5 text-xs" align="start">
        <p className="font-medium text-foreground">We think: {choice.label}</p>
        {suggestion.reason ? <p className="text-muted-foreground">{suggestion.reason}</p> : null}
        {typeof suggestion.probability === "number" ? (
          <p className="tabular-nums text-muted-foreground">{Math.round(suggestion.probability * 100)}% sure</p>
        ) : null}
        {suggestion.evidence?.length ? (
          <ul className="space-y-0.5">
            {suggestion.evidence.slice(0, 5).map((u) => (
              <li key={u} className="truncate">
                <OutboundLink href={u} className="text-primary underline-offset-2 hover:underline">
                  {u}
                </OutboundLink>
              </li>
            ))}
          </ul>
        ) : null}
        {suggestion.by ? <p className="text-muted-foreground">By {suggestion.by}</p> : null}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Where the result was found — query and rank; engine names only for admin debuggers. */
function FoundPopover({ result, showEngines }: { result: ReviewResult; showEngines: boolean }) {
  if (!result.hits.length) return null;
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <span className="cursor-default text-xs tabular-nums text-muted-foreground" data-testid="search-review-rank">
          #{bestRank(result)}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 space-y-1 text-xs" align="end">
        {result.hits.map((h, i) => (
          <p key={i} className="flex gap-2">
            <span className="tabular-nums text-muted-foreground">#{h.rank}</span>
            <span className="min-w-0 flex-1 truncate">{h.query}</span>
            {showEngines ? <span className="text-muted-foreground">{searchEngineLabel(h.engine)}</span> : null}
          </p>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}

function ResultCard({
  result,
  choices,
  answer,
  suggestion,
  showEngines,
  onAnswer,
}: {
  result: ReviewResult;
  choices: ReviewChoice[];
  answer: ReviewAnswer | undefined;
  suggestion: ReviewSuggestion | null | undefined;
  showEngines: boolean;
  onAnswer: (answer: ReviewAnswer | null) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = (a: ReviewAnswer | null) => {
    setBusy(true);
    setError(null);
    onAnswer(a)
      .catch((e: unknown) => setError(extractErrorMessage(e)))
      .finally(() => setBusy(false));
  };
  const chosenKey = answer?.status === "answered" ? answer.kind : null;
  const chosen = chosenKey ? choices.find((c) => c.key === chosenKey) : undefined;
  const suggested = suggestion ? choices.find((c) => c.key === suggestion.kind) : undefined;
  const pinned = choices.filter((c) => c.pinned);
  const more: SelectOption<string>[] = [
    { value: "", label: "More" },
    ...choices.filter((c) => !c.pinned).map((c) => ({ value: c.key, label: c.label, meta: c.group ?? undefined })),
  ];
  const pick = (key: string) => {
    if (!key) return;
    const c = choices.find((x) => x.key === key);
    send({ status: "answered", kind: key, sentiment: c?.hasSentiment && suggestion?.kind === key ? (suggestion.sentiment ?? null) : null });
  };
  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-b border-border/60 px-4 py-4 last:border-b-0",
        answer && "bg-muted/30",
      )}
      data-testid="search-review-item"
      data-key={result.key}
      data-answer={answer ? (answer.status === "answered" ? answer.kind : answer.status) : ""}
      data-suggested={suggestion?.kind ?? ""}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <SearchKindNested value={toWebResultValue(result)} />
        </div>
        <FoundPopover result={result} showEngines={showEngines} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5" aria-busy={busy}>
        {answer ? (
          <>
            <span className="text-sm font-medium" data-testid="search-review-answer">
              {chosen?.hasSentiment ? chosen.label : answerLabel(answer, choices)}
            </span>
            {chosen?.hasSentiment ? (
              <SegmentedControl
                aria-label="Sentiment"
                value={answer.status === "answered" ? (answer.sentiment ?? "") : ""}
                data={SENTIMENTS}
                onValueChange={(s) => send({ status: "answered", kind: chosen.key, sentiment: s as ReviewSentiment })}
              />
            ) : null}
            <Button variant="quiet" icon={<RotateCcw aria-hidden />} onClick={() => send(null)} data-testid="search-review-undo">
              Change
            </Button>
          </>
        ) : (
          <>
            {suggested && suggestion ? (
              <SuggestionPopover suggestion={suggestion} choice={suggested} onPick={() => pick(suggested.key)} />
            ) : null}
            {pinned
              .filter((c) => c.key !== suggested?.key)
              .map((c) => (
                <Button key={c.key} variant="outline" title={c.description ?? undefined} onClick={() => pick(c.key)}>
                  {c.label}
                </Button>
              ))}
            {more.length > 1 ? (
              <Select aria-label="More answers" value="" options={more} onValueChange={pick} className="min-w-28" />
            ) : null}
            <span className="ml-auto flex items-center gap-1">
              <Button variant="quiet" icon={<Clock aria-hidden />} onClick={() => send({ status: "later" })}>
                Ask me later
              </Button>
              <Button variant="quiet" icon={<EyeOff aria-hidden />} onClick={() => send({ status: "ignored" })}>
                Ignore
              </Button>
            </span>
          </>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </li>
  );
}

function copyText(session: SearchReviewSession): string {
  const lines = [`# ${session.subject.name} — search results`, ""];
  for (const r of session.results) {
    const a = session.answers[r.key];
    lines.push(`- [${resultTitle(r.result) ?? r.key}](${resultUrl(r.result) ?? ""})${a ? ` — ${answerLabel(a, session.choices)}` : ""}`);
  }
  return lines.join("\n");
}

export function SearchReviewBody({ session }: { session: SearchReviewSession }) {
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const [view, setView] = useState<View>("open");
  const { results, answers, choices } = session;
  const count = (v: View) => results.filter((r) => inView(answers[r.key], v)).length;
  const done = count("answered");
  // "Ask me later" sends a result to the back of the line.
  const shown = results
    .filter((r) => inView(answers[r.key], view))
    .sort((a, b) => Number(answers[a.key]?.status === "later") - Number(answers[b.key]?.status === "later") || bestRank(a) - bestRank(b));
  const onAnswer = async (key: string, answer: ReviewAnswer | null) => {
    await session.onAnswer(key, answer);
  };
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="search-review-body">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        {session.subject.imageUrl ? (
          <img src={session.subject.imageUrl} alt="" className="size-5 shrink-0 rounded object-contain" />
        ) : null}
        <span className="min-w-0 truncate text-sm font-medium" data-testid="search-review-subject">
          {session.subject.name}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground" data-testid="search-review-progress">
          {done} of {results.length}
        </span>
        <SegmentedControl
          className="ml-auto"
          aria-label="Show"
          value={view}
          onValueChange={(v) => setView(v as View)}
          data={[
            { value: "open", label: `To answer ${count("open")}` },
            { value: "later", label: `Later ${count("later")}` },
            { value: "answered", label: `Answered ${done}` },
            { value: "all", label: "All" },
          ]}
        />
        <CopyButtons
          size="xs"
          label="Search results"
          human={() => copyText(session)}
          contentFlavor="markdown"
          json={() => ({ subject: session.subject, results: session.results, answers: session.answers })}
        />
      </div>
      {shown.length ? (
        <ul className="@container min-h-0 flex-1 overflow-y-auto">
          {shown.map((r) => (
            <ResultCard
              key={r.key}
              result={r}
              choices={choices}
              answer={answers[r.key]}
              suggestion={session.suggestions?.[r.key]}
              showEngines={isAdminDebugger}
              onAnswer={(a) => onAnswer(r.key, a)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={<Search aria-hidden />}
            title={view === "open" ? "All answered" : "Nothing here"}
            action={view !== "all" ? <Button variant="quiet" onClick={() => setView("all")}>Show all</Button> : undefined}
          />
        </div>
      )}
    </div>
  );
}
