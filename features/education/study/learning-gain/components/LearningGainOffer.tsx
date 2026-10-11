"use client";

// features/education/study/learning-gain/components/LearningGainOffer.tsx
//
// THE one learning-gain offer card. Rendered where a deck is born (a study kit's
// board when its deck lands, the deck page right after "Make the deck") and on
// the deck page as it is studied:
//   - a skippable short BASELINE before studying (5 questions by default, knob
//     `education.learning_gain.baseline_questions`), and
//   - the POST-test, once, when deck mastery crosses the threshold knob
//     (`education.learning_gain.post_test_mastery`, default 0.8).
// The decision is `decideGainOffer` (pure). A skip is remembered per deck in
// `userPreferences.flashcard.learningGainOffers` (synced to the server), so it
// never asks again on any device.
//
// Reuse, never a second engine: the baseline is a quiz made by THE one
// generation path (`useAssessmentGeneration`, deck mode — gated + metered), then
// taken through the assessment taker with `phase=baseline` and a fresh
// gain_group_id; the post-test re-takes that SAME quiz with `phase=post`.
//
// React Compiler is on: no manual memo.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, TrendingUp } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { LiveRunDisplay } from "@ai-matrx/chat/agents/components/live-run/LiveRunDisplay";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { useSetting } from "@/features/settings/hooks/useSetting";
import { assessmentService } from "@/features/education/assessment/data/assessmentService";
import { useAssessmentGeneration } from "@/features/education/assessment/data/useAssessmentGeneration";
import { newGainGroupId } from "@/features/education/assessment/data/learningGain";
import { KIND_CONFIG } from "@/features/education/assessment/components/kindConfig";
import type { AssessmentResultRow } from "@/features/education/assessment/data/types";
import {
  BASELINE_QUESTIONS_KNOB,
  DEFAULT_BASELINE_QUESTIONS,
  DEFAULT_POST_TEST_MASTERY,
  POST_TEST_MASTERY_KNOB,
  baselineOfferKey,
  decideGainOffer,
  postOfferKey,
} from "../gainOffer";

const QUIZ = KIND_CONFIG.quiz;

function takeHref(assessmentId: string, phase: "baseline" | "post", gain: string) {
  const params = new URLSearchParams({ start: "1", phase, gain });
  return `/education/${QUIZ.base}/${assessmentId}?${params}`;
}

function knobNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function LearningGainOffer({
  deckId,
  deckName,
  studied,
  masteredPct,
  className,
}: {
  deckId: string;
  deckName: string;
  /** Cards studied at least once; null while unknown (nothing shows). */
  studied: number | null;
  /** Share of the deck mastered 0..1; null while unknown. */
  masteredPct: number | null;
  className?: string;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const userId = useAppSelector(selectUserId);
  const organizationId = useAppSelector(selectOrganizationId);
  const threshold = knobNumber(
    useEffectiveKnob(organizationId, userId, POST_TEST_MASTERY_KNOB),
    DEFAULT_POST_TEST_MASTERY,
  );
  const baselineCount = knobNumber(
    useEffectiveKnob(organizationId, userId, BASELINE_QUESTIONS_KNOB),
    DEFAULT_BASELINE_QUESTIONS,
  );
  const [answered, setAnswered] = useSetting<Record<string, string> | undefined>(
    "userPreferences.flashcard.learningGainOffers",
  );
  const generation = useAssessmentGeneration(QUIZ);
  const [results, setResults] = useState<AssessmentResultRow[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void assessmentService.listGainResults().then((res) => {
      if (cancelled) return;
      // A failed read offers nothing rather than a baseline the person may
      // already have taken.
      if (res.error) {
        console.error("[learning-gain offer] gain results read failed:", res.error);
        return;
      }
      setResults(res.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, deckId]);

  const offer = results
    ? decideGainOffer({
        deckId,
        results,
        answered: answered ?? {},
        studied,
        masteredPct,
        threshold,
      })
    : null;

  const busy = generation.isGenerating || isNavigating;

  const remember = (key: string) =>
    setAnswered({ ...(answered ?? {}), [key]: new Date().toISOString() });

  const takeBaseline = async () => {
    const outcome = await generation.run({
      source: { mode: "deck", deck: { id: deckId, name: deckName } },
      count: baselineCount,
      difficulty: "Medium",
      depth: "recall",
      questionTypes: [],
      examType: "",
      userRequest: "A short baseline check taken before studying this deck.",
      timeLimitMinutes: 0,
    });
    if (outcome.status === "failed") {
      toast.error(outcome.error);
      return;
    }
    if (outcome.status !== "created") return;
    remember(baselineOfferKey(deckId));
    startNavigation(() =>
      router.push(takeHref(outcome.assessment.id, "baseline", newGainGroupId())),
    );
  };

  if (!offer && !generation.isGenerating) return <generation.Gates />;

  return (
    <section
      aria-label="Learning gain"
      className={
        "rounded-xl border border-border bg-card p-3 sm:p-4" +
        (className ? ` ${className}` : "")
      }
    >
      <generation.Gates />
      {generation.isGenerating ? (
        <LiveRunDisplay
          conversationId={generation.conversationId}
          label="Writing your baseline"
          pending
          variant="bare"
          bodyClassName="max-h-60 overflow-y-auto px-2.5 py-2 text-sm"
        />
      ) : offer?.kind === "post" ? (
        <OfferRow
          icon={<TrendingUp className="h-4 w-4" />}
          title="Ready for your post-test"
          hint="See how much you gained since your baseline"
          action="Take post-test"
          busy={busy}
          onTake={() => {
            remember(postOfferKey(deckId));
            startNavigation(() =>
              router.push(takeHref(offer.assessmentId, "post", offer.gainGroupId)),
            );
          }}
          onSkip={() => remember(postOfferKey(deckId))}
        />
      ) : (
        <OfferRow
          icon={<ClipboardCheck className="h-4 w-4" />}
          title={`Take a ${baselineCount}-question baseline`}
          hint="Measures what you learn from this deck"
          action="Take baseline"
          busy={busy}
          onTake={() => void takeBaseline()}
          onSkip={() => remember(baselineOfferKey(deckId))}
        />
      )}
    </section>
  );
}

function OfferRow({
  icon,
  title,
  hint,
  action,
  busy,
  onTake,
  onSkip,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action: string;
  busy: boolean;
  onTake: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 text-primary">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="quiet" onClick={onSkip} disabled={busy}>
          Skip
        </Button>
        <Button variant="primary" onClick={onTake} disabled={busy}>
          {action}
        </Button>
      </div>
    </div>
  );
}
