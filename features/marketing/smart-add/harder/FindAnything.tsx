"use client";

/**
 * Smart Add · the person hard / close-to-impossible paths — "find anything that's you" (PATHS.md §8; VISION Part 14).
 *
 * - `SweepReview`: the Brave + Google sweep (aidream person_hard.py), tier by tier, best first ("Show next"), one
 *   click per result: This is me / Maybe / Not me. It is THE search-review primitive (`SearchReviewBody`, the
 *   canonical web_result renderer) rendered inline — never a second list renderer. Junk is the last tier.
 * - `FocusList`: one focused window per platform (the Smart Add helper panels). Each is marked done when finished,
 *   with or without a find, and can always be reopened. A find lands in the core run through the helpers' answer
 *   channel (the host confirms it and the next round grounds on it).
 */

import { Check, RotateCcw } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { SearchReviewBody } from "@/features/search-review/SearchReviewBody";
import type { ReviewAnswer, ReviewChoice, ReviewResult, SearchReviewSession } from "@/features/search-review/types";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { useOpenSmartAddHelper } from "@/features/overlays/openers/smartAddHelperWindow";
import { HELPER_LABELS, type HelperMethod } from "../helpers/types";
import type { FocusState, HarderCandidate, SweepAnswer, SweepRow, TierCount } from "./types";

const CHOICES: ReviewChoice[] = [
  { key: "me", label: "This is me", pinned: true },
  { key: "maybe", label: "Maybe", pinned: true },
  { key: "not_me", label: "Not me", pinned: true },
];

/** Platform → the helper window that searches it (X runs through Grok). */
export const FOCUS: { key: string; method: HelperMethod; mark: string; label: string }[] = [
  { key: "linkedin", method: "linkedin", mark: "linkedin", label: "LinkedIn" },
  { key: "facebook", method: "facebook", mark: "facebook", label: "Facebook" },
  { key: "instagram", method: "instagram", mark: "instagram", label: "Instagram" },
  { key: "tiktok", method: "tiktok", mark: "tiktok", label: "TikTok" },
  { key: "youtube", method: "youtube", mark: "youtube", label: "YouTube" },
  { key: "x", method: "grok", mark: "x", label: "X" },
  { key: "threads", method: "threads", mark: "threads", label: "Threads" },
  { key: "google", method: "google", mark: "website", label: "Google" },
];

/** The focus key a found candidate belongs to (a website comes from the Google window). */
export function focusKeyOf(platform: string): string {
  return FOCUS.some((f) => f.key === platform) ? platform : "google";
}

export function sweepCandidate(r: SweepRow): HarderCandidate {
  return {
    key: r.key,
    platform: r.platform,
    url: r.url,
    handle: r.handle,
    name: r.title,
    headline: null,
    location: null,
    employer: null,
    image_url: null,
    followers: null,
    verified: null,
    snippet: r.snippet,
    sources: [...new Set(r.hits.map((h) => h.engine))],
    hits: r.hits.map((h) => ({ query: h.query, page: h.page, rank: h.rank })),
    bucket: r.anchor_kind === "social" ? "social" : "web",
    score: r.score,
    reasons: r.reasons,
    anchor_kind: r.anchor_kind,
    firm: r.firm,
    clues: r.clues,
  };
}

export function SweepReview({
  name,
  rows,
  tiers,
  answers,
  onAnswer,
}: {
  name: string;
  rows: SweepRow[];
  tiers: TierCount[];
  answers: Record<string, SweepAnswer>;
  onAnswer: (row: SweepRow, answer: SweepAnswer | null) => void;
}) {
  const results: ReviewResult[] = rows.map((r) => ({
    key: r.key,
    result: r.raw,
    hits: r.hits.map((h) => ({ engine: h.engine, rank: h.rank, query: h.query })),
    tier: r.tier,
    adminNote: `${r.tier}: ${r.tier_reason} · match ${r.score}`,
  }));
  const reviewAnswers: Record<string, ReviewAnswer> = {};
  for (const [k, a] of Object.entries(answers)) reviewAnswers[k] = { status: "answered", kind: a, sentiment: null };
  const session: SearchReviewSession = {
    title: `Find ${name}`,
    subject: { type: "person", name },
    results,
    choices: CHOICES,
    answers: reviewAnswers,
    tiers: tiers.map((t) => ({ key: t.key, label: t.label })),
    onAnswer: (key, a) => {
      const row = rows.find((r) => r.key === key);
      if (!row) return;
      onAnswer(row, a?.status === "answered" ? (a.kind as SweepAnswer) : a?.status === "ignored" ? "not_me" : null);
    },
  };
  return (
    <div data-testid="smart-add-find-anything" className="flex h-[min(70vh,44rem)] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <SearchReviewBody session={session} />
    </div>
  );
}

export function FocusList({
  focus,
  stuck,
  onOpen,
  onDone,
}: {
  focus: Record<string, FocusState>;
  /** Nothing matched yet: the list is the next step, not an extra. */
  stuck: boolean;
  onOpen: (key: string) => void;
  onDone: (key: string) => void;
}) {
  const open = useOpenSmartAddHelper();
  return (
    <section data-testid="smart-add-focus" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <h3 className="text-sm font-semibold text-foreground">{stuck ? "Try one place at a time" : "Search one platform"}</h3>
      <ul className="flex flex-col gap-1">
        {FOCUS.map((f) => {
          const s = focus[f.key];
          return (
            <li key={f.key} className="flex items-center gap-2 rounded-lg px-1.5 py-1" data-testid={`smart-add-focus-${f.key}`} data-status={s?.status ?? "new"}>
              <PlatformMark platform={f.mark} size={16} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.label}</span>
              {s?.status === "done" ? (
                <Badge tone={s.found ? "success" : "neutral"}>{s.found ? "Found" : "Done"}</Badge>
              ) : s?.status === "open" ? (
                <Badge tone="info">Open</Badge>
              ) : null}
              <Button
                variant={s ? "quiet" : "outline"}
                icon={s?.status === "done" ? <RotateCcw aria-hidden /> : undefined}
                onClick={() => {
                  open(f.method);
                  onOpen(f.key);
                }}
                title={HELPER_LABELS[f.method]}
              >
                {s?.status === "done" ? "Reopen" : s ? "Show" : "Open"}
              </Button>
              {s?.status === "open" ? (
                <Button variant="quiet" icon={<Check aria-hidden />} onClick={() => onDone(f.key)}>
                  Done
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
