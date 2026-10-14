"use client";

/**
 * Smart Add — the "On the web" step, now OPTIONAL: one compact entry ("Review 37 web results") that
 * opens the platform's "Review search results" window (features/search-review) beside the flow.
 *
 * The window shows every merged + deduped web result (evidence.webRow) in the Search Lab's own
 * renderer and asks ONE question per result: what is this to us? Answers are the shared vocabulary
 * `web.brand_relation_kind`; the rule-based suggestion (webKinds.suggestKind, no AI) glows with its
 * reason on hover and is never set for the person. Answers flow back through `onChoose` into the same
 * `webChoices` state as before, so create-time persistence (relations.routeWebChoices), the validation
 * page and the Builder panel feed are unchanged. Ask me later / Ignore stay pending: unanswered
 * results are kept as candidates at create, exactly as before.
 */

import { Globe } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { usePublishSearchReviewSession } from "@/features/search-review/sessionStore";
import { useOpenSearchReviewWindow } from "@/features/overlays/openers/searchReviewWindow";
import type { ReviewAnswer, ReviewChoice, ReviewResult, ReviewSuggestion } from "@/features/search-review/types";
import type { EvidenceItem } from "./evidence";
import { useState } from "react";
import { webRow } from "./evidence";
import type { WebMark } from "./runMemory";
import { STANCE_LABEL, STANCE_ORDER, suggestKind, type SuggestContext, type WebChoice } from "./webKinds";

/** The one-click answers; every other kind is under "More". */
const PINNED = new Set(["ours", "mention", "review_site", "competitor", "not_us", "irrelevant"]);

/** An evidence item → the raw-result shape the review window renders (title, url, description, favicon). */
export function reviewResultOf(item: EvidenceItem): ReviewResult {
  const url = item.url ?? item.value;
  // A review/listing page carries the site's name as its label and the page's own title as its handle.
  const listing = item.field === "listing";
  return {
    key: item.key,
    result: {
      title: listing ? (item.handle ?? item.label ?? url) : (item.label ?? item.handle ?? url),
      url,
      description: item.snippet ?? null,
      favicon: item.image_url,
      site_name: listing ? item.label : null,
    },
    hits: (item.hits ?? []).map((h) => ({ engine: h.engine, rank: h.rank, query: h.query, endpoint: h.endpoint })),
  };
}

export function reviewChoicesOf(kinds: BrandRelationKind[]): ReviewChoice[] {
  return [...kinds]
    .sort((a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance) || Number(b.isKnown) - Number(a.isKnown))
    .map((k) => ({
      key: k.key,
      label: k.label,
      group: STANCE_LABEL[k.stance],
      description: k.description,
      hasSentiment: k.hasSentiment,
      pinned: PINNED.has(k.key),
    }));
}

export function SmartAddWebRow({
  items,
  kinds,
  choices,
  ctx,
  onChoose,
  marks: savedMarks,
  onMark: saveMark,
}: {
  items: EvidenceItem[];
  kinds: BrandRelationKind[];
  choices: Record<string, WebChoice>;
  ctx: SuggestContext;
  onChoose: (item: EvidenceItem, choice: WebChoice | null) => void;
  /** Ask me later / Ignore: the person's place in the review, kept by the session so a reload returns to it. */
  marks?: Record<string, WebMark>;
  onMark?: (key: string, mark: WebMark | null) => void;
}) {
  // Without a session (the lab) the marks live here.
  const [localMarks, setLocalMarks] = useState<Record<string, WebMark>>({});
  const marks = savedMarks ?? localMarks;
  const onMark = (key: string, mark: WebMark | null) =>
    saveMark ? saveMark(key, mark) : setLocalMarks(({ [key]: _drop, ...rest }) => (mark ? { ...rest, [key]: mark } : rest));
  const row = webRow(items);
  const byKey = new Map(row.map((i) => [i.key, i]));
  const answers: Record<string, ReviewAnswer> = {};
  for (const i of row) {
    const c = choices[i.key];
    if (c) answers[i.key] = { status: "answered", kind: c.kind, sentiment: c.sentiment };
    else if (marks[i.key]) answers[i.key] = { status: marks[i.key] };
  }
  const suggestions: Record<string, ReviewSuggestion | null> = {};
  for (const i of row) {
    // The web-result classifier's suggestion (weThink.withSuggestions) wins over the rules'.
    const agent = i.suggestion as { by?: string; choice?: string; relation_key?: string | null; sentiment?: ReviewSuggestion["sentiment"]; probability?: number | null; reason?: string; evidence?: string[] } | null | undefined;
    const byAgent = agent?.by === "agent";
    const agentKind = byAgent ? (agent.relation_key ?? (agent.choice === "ours" || agent.choice === "not_us" ? agent.choice : null)) : null;
    // Once the classifier answered, its answer is the glow, even "the facts cannot decide" (no glow): the rules'
    // default never shows over it.
    const s = byAgent ? null : suggestKind(i, kinds, ctx);
    suggestions[i.key] = agentKind
      ? { kind: agentKind, sentiment: agent?.sentiment ?? null, probability: agent?.probability ?? null, reason: agent?.reason ?? "", evidence: agent?.evidence, by: "We think" }
      : s
        ? { kind: s.kind, reason: s.reason, by: "Rules" }
        : null;
  }
  const sessionId = usePublishSearchReviewSession(
    row.length
      ? {
          title: ctx.name ? `On the web · ${ctx.name}` : "On the web",
          subject: { type: "brand", name: ctx.name ?? "This brand" },
          results: row.map(reviewResultOf),
          choices: reviewChoicesOf(kinds),
          answers,
          suggestions,
          onAnswer: (key, answer) => {
            const item = byKey.get(key);
            if (!item) return;
            onMark(key, answer && answer.status !== "answered" ? answer.status : null);
            onChoose(item, answer?.status === "answered" ? { kind: answer.kind, sentiment: answer.sentiment } : null);
          },
        }
      : null,
  );
  const open = useOpenSearchReviewWindow();
  if (!row.length) return null;
  const answered = row.filter((i) => choices[i.key]).length;
  return (
    <section
      className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2"
      data-testid="smart-add-web-row"
      data-our-hosts={ctx.ourHosts.join(" ")}
    >
      <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-xs font-medium text-foreground/80">On the web</span>
      <Button
        variant="outline"
        className="ml-auto"
        onClick={() => open(sessionId)}
        meta={answered ? `${answered} answered` : undefined}
        data-testid="smart-add-web-review"
      >
        {`Review ${row.length} web results`}
      </Button>
    </section>
  );
}
