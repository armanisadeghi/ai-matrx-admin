// features/flashcards/components/study/LearnSurface.tsx
//
// Learn mode — Quizlet Learn parity. Every card climbs two stages in short
// rounds: RECOGNIZE (multiple choice, the same questions Test builds via
// buildQuizQuestions) then RECALL (type the answer). A typed answer that
// matches after normalisation is correct instantly with no AI call; anything
// else is graded on meaning (gradeTypedSemantic) IN THE BACKGROUND — the
// learner never waits on it. Continuing before the verdict steps the machine
// with the spelling grade, and the verdict is applied when it lands
// (settleTypedVerdict) and shown on the round screen with "I was right".
// A card is mastered only by a correct typed answer; a miss comes back later
// in the round, and a missed recall drops the card back to multiple choice.
// Both stages honor the learner's "Answer with" preference. The session is
// completed only when every card is mastered. Every answer is recorded once,
// with its final grade, through useFlashcardStudy.grade.
//
// React Compiler is on: no manual useMemo / useCallback / React.memo.

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { studyService } from "@/features/education/study/service/studyService";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import { AccessGate } from "@/features/access-gate/components/AccessGate";
import PageHeader from "@/features/shell/components/header/PageHeader";
import CardFaceBlock from "@/components/mardown-display/blocks/flashcards/CardFaceBlock";
import { AskTutorButton } from "@/features/education/tutor/components/AskTutorButton";
import {
  deckStudyContext,
  flashcardTutorSeed,
  missedQuestionTutorSeed,
  openQuestionTutorSeed,
} from "@/features/education/tutor/seeds";
import { useAiComplianceGate } from "@/features/education/compliance/useAiComplianceGate";
import { useSetting } from "@/features/settings/hooks/useSetting";
import { useAppDispatch } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useFlashcardStudy } from "../../data/useFlashcardStudy";
import { useFlashcardStudySurface } from "./useFlashcardStudySurface";
import { StudyDeckHeader } from "./StudyDeckHeader";
import { OfflineDeckButton } from "../set-detail/OfflineDeckButton";
import { useFlashcardMandates } from "../../data/mandate-disclosure";
import {
  buildQuizQuestions,
  type QuizQuestion,
} from "../../data/quiz/buildQuizQuestions";
import { gradeTypedSemantic } from "../../data/gradeTypedSemantic";
import { answersMatch, gradeTypedAnswer } from "../../utils/textSimilarity";
import { orientedStudyFaces, type AnswerWith } from "../../utils/cardVariants";
import {
  clampRoundSize,
  roundSizeChoices,
  shuffleItems,
} from "../../data/roundSize";
import {
  answerLearn,
  currentLearnItem,
  dealRound,
  isAllMastered,
  isRoundOver,
  learnCounts,
  settleTypedVerdict,
  startLearn,
  type LearnState,
} from "../../data/learnQueue";
import type { CardWithDetails } from "../../data/types";
import type { ReviewResult } from "../../types";
import {
  QuizOptionGrid,
  ROUND_PAGE_CLASS,
  RoundComplete,
  RoundProgress,
  RoundSizeMenu,
} from "./round-controls";

const EDU_BASE = "/education/flashcards";
/** Cards per Learn round until the learner picks. */
export const DEFAULT_LEARN_ROUND_SIZE = 10;
const LEARN_ROUND_SIZE_SETTING = "userPreferences.flashcard.learnRoundSize";
const ANSWER_WITH_SETTING = "userPreferences.flashcard.answerWith";

type Verdict = { result: ReviewResult; reason: string | null };

/** One typed answer: graded instantly, or checked on meaning in the background. */
interface TypedCheck {
  cardId: string;
  round: number;
  typed: string;
  /** Chosen here so a late "I was right" can correct the recorded attempt. */
  attemptId: string;
  /** The spelling grade — what the stage machine uses if the learner moves on first. */
  provisional: ReviewResult;
  /** Null while the meaning check runs. */
  verdict: Verdict | null;
  /** The learner continued before the verdict landed. */
  moved: boolean;
  recorded: boolean;
  /** The learner claimed it ("I was right") — a landing verdict is ignored. */
  claimed: boolean;
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** A fresh run: shuffled order, cards with no distractors start at recall. */
function freshRun(
  cards: CardWithDetails[],
  size: number,
  answerWith: AnswerWith,
): { learn: LearnState; questions: Record<string, QuizQuestion> } {
  const questions: Record<string, QuizQuestion> = {};
  for (const q of buildQuizQuestions(cards, cards, answerWith)) questions[q.cardId] = q;
  const typedOnly = new Set(
    cards.filter((c) => (questions[c.id]?.options.length ?? 0) < 2).map((c) => c.id),
  );
  const order = shuffleItems(cards.map((c) => c.id));
  return { learn: dealRound(startLearn(order, typedOnly), size), questions };
}

export function LearnSurface({ setId }: { setId: string }) {
  useFlashcardMandates(["gradeTypedAnswer"]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const coppa = useAiComplianceGate();
  const [run, setRun] = useState<{
    deckKey: string;
    learn: LearnState;
    questions: Record<string, QuizQuestion>;
  } | null>(null);
  // Typed answers by question key. The ref is the truth the background
  // verdict reads after an await; the state mirrors it for render.
  const checksRef = useRef<Record<string, TypedCheck>>({});
  const [checks, setChecks] = useState<Record<string, TypedCheck>>({});

  // Mastered and settled: a card awaiting its meaning check is not yet
  // mastered for the session's completion.
  const unsettled = Object.values(checks).filter(
    (c) => c.moved && c.verdict === null && !c.claimed && c.provisional === "correct",
  ).length;
  const study = useFlashcardStudy({
    setId,
    withSession: true,
    mode: "learn",
    mastery: run
      ? {
          mastered: Math.max(0, learnCounts(run.learn).mastered - unsettled),
          total: run.learn.order.length,
        }
      : { mastered: 0, total: 0 },
  });
  const title = study.set?.name ?? "";
  const cards = study.cards;
  const deckSize = cards.length;

  const [savedSize, setSavedSize] = useSetting<number>(LEARN_ROUND_SIZE_SETTING);
  const roundSize = clampRoundSize(savedSize, deckSize, DEFAULT_LEARN_ROUND_SIZE);
  const sizeChoices = roundSizeChoices(deckSize);
  const [answerWithSetting] = useSetting<AnswerWith>(ANSWER_WITH_SETTING);
  const answerWith: AnswerWith = answerWithSetting === "term" ? "term" : "definition";

  // The run is built once per loaded deck (render-time adjustment, no effect).
  const deckKey = study.loading ? null : `${answerWith}|${cards.map((c) => c.id).join(",")}`;
  if (deckKey && cards.length > 0 && run?.deckKey !== deckKey) {
    setRun({ deckKey, ...freshRun(cards, roundSize, answerWith) });
  }

  const learn = run?.learn ?? null;
  const item = learn ? currentLearnItem(learn) : null;
  const card = item ? cards.find((c) => c.id === item.cardId) ?? null : null;
  const faces = card ? orientedStudyFaces(card, answerWith) : null;
  const question = item && run ? run.questions[item.cardId] ?? null : null;
  const roundOver = learn ? isRoundOver(learn) : false;
  const mastered = learn ? isAllMastered(learn) : false;

  // The tutor sees what the learner is on; the answer seen state follows it.
  const [answered, setAnswered] = useState<{ key: string; answer: string } | null>(null);
  const itemKey = learn && item ? `${learn.round}:${learn.position}` : "";
  const answeredHere = answered?.key === itemKey ? answered : null;
  // The page's agents read the card Learn is on, not the hook's own index.
  const cardIndex = card ? cards.indexOf(card) : -1;
  useFlashcardStudySurface({
    setId,
    study: {
      ...study,
      currentIndex: cardIndex,
      isFlipped: answeredHere !== null,
    },
    mode: "learn",
    backSeen: answeredHere !== null,
  });

  const step = (correct: boolean): void => {
    setRun((r) => (r ? { ...r, learn: answerLearn(r.learn, correct) } : r));
  };
  const nextRound = (): void => {
    setRun((r) =>
      r ? { ...r, learn: dealRound(r.learn, clampRoundSize(savedSize, deckSize, DEFAULT_LEARN_ROUND_SIZE)) } : r,
    );
  };
  const restart = (): void => {
    if (deckKey) setRun({ deckKey, ...freshRun(cards, roundSize, answerWith) });
  };
  const leave = (): void => {
    study.endSession?.();
    router.push(`${EDU_BASE}/${setId}`);
  };

  const record = (
    cardId: string,
    result: ReviewResult,
    responseKind: "selected" | "typed",
    transcript: string,
    attemptId?: string,
  ): void => {
    void study.grade(result, {
      cardId,
      responseKind,
      ...(transcript ? { responseTranscript: transcript } : {}),
      ...(attemptId ? { attemptId } : {}),
    });
  };

  const patchCheck = (key: string, patch: Partial<TypedCheck>): TypedCheck | null => {
    const prev = checksRef.current[key];
    if (!prev) return null;
    const next = { ...prev, ...patch };
    checksRef.current = { ...checksRef.current, [key]: next };
    setChecks(checksRef.current);
    return next;
  };
  const settle = (c: TypedCheck, from: ReviewResult, to: ReviewResult): void => {
    setRun((r) =>
      r
        ? {
            ...r,
            learn: settleTypedVerdict(r.learn, {
              cardId: c.cardId,
              round: c.round,
              provisionalCorrect: from === "correct",
              correct: to === "correct",
            }),
          }
        : r,
    );
  };

  /** Grade a typed answer: instant when it matches, else on meaning in the background. */
  const submitTyped = (key: string, cardId: string, typed: string, front: string, back: string): void => {
    if (checksRef.current[key] || !learn) return;
    const blank = typed.trim() === "";
    const instant: ReviewResult | null = blank
      ? "incorrect"
      : answersMatch(typed, back)
        ? "correct"
        : coppa.blocked
          ? gradeTypedAnswer(typed, back)
          : null;
    const provisional = instant ?? gradeTypedAnswer(typed, back);
    checksRef.current = {
      ...checksRef.current,
      [key]: {
        cardId,
        round: learn.round,
        typed,
        attemptId: crypto.randomUUID(),
        provisional,
        verdict: instant ? { result: instant, reason: null } : null,
        moved: false,
        recorded: false,
        claimed: false,
      },
    };
    setChecks(checksRef.current);
    setAnswered({ key, answer: typed });
    if (instant) return;
    void dispatch(
      gradeTypedSemantic({ question: front, expectedAnswer: back, learnerAnswer: typed }),
    ).then((outcome) => {
      const c = checksRef.current[key];
      if (!c || c.claimed) return;
      const verdict: Verdict =
        outcome?.kind === "verdict" ? outcome.verdict : { result: c.provisional, reason: null };
      if (!c.moved) {
        patchCheck(key, { verdict });
        return;
      }
      // The learner moved on: record the final grade once, then fix the stage.
      record(c.cardId, verdict.result, "typed", c.typed, c.attemptId);
      patchCheck(key, { verdict, recorded: true });
      settle(c, c.provisional, verdict.result);
    });
  };

  /** Continue past a typed answer — never waits on the meaning check. */
  const continueTyped = (key: string, claim: boolean): void => {
    const c = checksRef.current[key];
    if (!c) return;
    if (claim || c.verdict) {
      const final: ReviewResult = claim ? "correct" : (c.verdict?.result ?? c.provisional);
      record(c.cardId, final, "typed", c.typed, c.attemptId);
      patchCheck(key, { recorded: true, claimed: claim });
      step(final === "correct");
      return;
    }
    patchCheck(key, { moved: true });
    step(c.provisional === "correct");
  };

  /** "I was right" after a late verdict was recorded: correct that attempt. */
  const claimLate = (key: string): void => {
    const c = checksRef.current[key];
    if (!c?.verdict || !c.recorded || c.verdict.result === "correct") return;
    const from = c.verdict.result;
    patchCheck(key, { claimed: true, verdict: { result: "correct", reason: null } });
    settle(c, from, "correct");
    void studyService
      .overrideAttempt({ attemptId: c.attemptId, result: "correct" })
      .then((res) => {
        if (res.error) toast.error("Couldn't save that change — try again.");
      });
  };

  const tutorSeed =
    !item || !faces
      ? null
      : item.stage === "choice" && question
        ? answeredHere
          ? missedQuestionTutorSeed({
              question: question.aiQuestion || question.front,
              learnerAnswer: answeredHere.answer,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              wasCorrect: same(answeredHere.answer, question.correctAnswer),
              studyContext: deckStudyContext(setId),
            })
          : openQuestionTutorSeed({
              question: question.aiQuestion || question.front,
              options: question.options,
              studyContext: deckStudyContext(setId),
            })
        : flashcardTutorSeed({
            front: faces.front,
            back: faces.back,
            topic: card?.topic,
            learnerAnswer: answeredHere?.answer ?? "",
            answered: answeredHere !== null,
            studyContext: deckStudyContext(setId),
          });

  return (
    <>
      <PageHeader>
        <StudyDeckHeader
          mode="Learn"
          title={title}
          backHref={`${EDU_BASE}/${setId}`}
          actions={
            <div className="flex items-center gap-1">
              {tutorSeed && !roundOver ? (
                <AskTutorButton seed={tutorSeed} iconOnly variant="ghost" />
              ) : null}
              <RoundSizeMenu
                dealt={roundSize}
                deckSize={deckSize}
                choices={sizeChoices}
                noun="Cards"
                onChange={(count) => setSavedSize(count)}
              />
              <OfflineDeckButton
                setId={setId}
                size="sm"
                compact
                disabled={study.loading || deckSize === 0}
              />
            </div>
          }
        />
      </PageHeader>
      <div className="h-full overflow-y-auto overscroll-contain bg-textured">
        <div className={ROUND_PAGE_CLASS}>
          {study.loading || (deckSize > 0 && !learn) ? (
            <div className="flex h-64 items-center justify-center">
              <MatrxMiniLoader />
            </div>
          ) : study.error ? (
            <AccessGate
              token="fc_set"
              id={setId}
              error={study.error}
              fallbackHref={EDU_BASE}
              fallbackLabel="Flashcards"
            />
          ) : deckSize === 0 || !learn ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No cards yet</p>
            </div>
          ) : roundOver ? (
            <RoundComplete
              title={mastered ? "All cards mastered" : `Round ${learn.round} done`}
              correct={learn.roundCardIds.length - learn.roundMissed.length}
              total={learn.roundCardIds.length}
              missed={learn.roundMissed.length}
              deckSize={deckSize}
              sizeChoices={mastered ? [] : sizeChoices}
              dealt={roundSize}
              onSizeChange={(count) => setSavedSize(count)}
              onRetake={mastered ? restart : nextRound}
              retakeLabel={mastered ? "Learn again" : "Continue"}
              onBack={leave}
            >
              <StageBar learn={learn} />
              <LateVerdicts
                checks={Object.entries(checks).filter(
                  ([, c]) => c.moved && c.round === learn.round,
                )}
                onClaim={claimLate}
              />
            </RoundComplete>
          ) : item && faces ? (
            <>
              <RoundProgress
                position={Math.min(learn.position + 1, learn.queue.length)}
                total={learn.queue.length}
                correct={learn.roundCorrect}
              />
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {item.stage === "choice" ? "Choose the answer" : "Type the answer"}
              </p>
              {item.stage === "choice" && question ? (
                <ChoiceQuestion
                  key={itemKey}
                  question={question}
                  onAnswer={(option) => {
                    setAnswered({ key: itemKey, answer: option });
                    const ok = same(option, question.correctAnswer);
                    record(item.cardId, ok ? "correct" : "incorrect", "selected", option);
                  }}
                  onNext={(ok) => step(ok)}
                />
              ) : (
                <TypedQuestion
                  key={itemKey}
                  front={faces.front}
                  back={faces.back}
                  check={checks[itemKey] ?? null}
                  onSubmit={(typed) =>
                    submitTyped(itemKey, item.cardId, typed, faces.front, faces.back)
                  }
                  onContinue={(claim) => continueTyped(itemKey, claim)}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Cards in each stage across the whole deck. */
function StageBar({ learn }: { learn: LearnState }) {
  const counts = learnCounts(learn);
  const total = learn.order.length || 1;
  const parts = [
    { key: "mastered", label: "Mastered", n: counts.mastered, bar: "bg-green-500" },
    { key: "typed", label: "Recall next", n: counts.typed, bar: "bg-amber-500" },
    { key: "choice", label: "Learning", n: counts.choice, bar: "bg-muted-foreground/30" },
  ];
  return (
    <div className="w-full">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {parts.map((p) =>
          p.n > 0 ? (
            <div
              key={p.key}
              className={cn("h-full", p.bar)}
              style={{ width: `${(p.n / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5 tabular-nums">
            <span className={cn("h-2 w-2 rounded-full", p.bar)} aria-hidden />
            {p.label} {p.n}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChoiceQuestion({
  question,
  onAnswer,
  onNext,
}: {
  question: QuizQuestion;
  onAnswer: (option: string) => void;
  onNext: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const correct = answered && same(selected, question.correctAnswer);
  const pick = (option: string): void => {
    if (answered) return;
    setSelected(option);
    onAnswer(option);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [role='dialog']")) return;
      if (!answered) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= question.options.length) {
          e.preventDefault();
          pick(question.options[n - 1]);
        }
      } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        onNext(correct);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <div className="flex min-h-32 flex-col justify-center rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:min-h-48 sm:px-8">
        <CardFaceBlock
          content={question.aiQuestion || question.front}
          size="card"
          align="center"
        />
      </div>
      <QuizOptionGrid
        options={question.options}
        correctAnswer={question.correctAnswer}
        selected={selected}
        answered={answered}
        onPick={pick}
      />
      {answered && question.explanation ? (
        <p className="mt-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground">
          {question.explanation}
        </p>
      ) : null}
      {answered ? (
        <Button
          iconEnd={<ArrowRight />}
          variant="primary"
          className="mt-4 w-full"
          onClick={() => onNext(correct)}
        >
          {correct ? "Next" : "Got it"}
        </Button>
      ) : null}
    </>
  );
}

const VERDICT_UI: Record<
  ReviewResult,
  { label: string; icon: typeof XCircle; banner: string }
> = {
  correct: {
    label: "Correct",
    icon: CheckCircle2,
    banner: "border-green-500/50 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200",
  },
  partial: {
    label: "Almost",
    icon: AlertCircle,
    banner: "border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  },
  incorrect: {
    label: "Not quite",
    icon: XCircle,
    banner: "border-red-500/50 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
  },
};

/** Answers graded after the learner moved on, shown quietly on the round screen. */
function LateVerdicts({
  checks,
  onClaim,
}: {
  checks: [string, TypedCheck][];
  onClaim: (key: string) => void;
}) {
  if (checks.length === 0) return null;
  return (
    <ul className="w-full divide-y divide-border rounded-xl border border-border text-left text-sm">
      {checks.map(([key, c]) => {
        const result = c.verdict?.result ?? null;
        return (
          <li key={key} className="flex items-center gap-2 px-3 py-2">
            {result === null ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : result === "correct" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span className="min-w-0 flex-1 truncate text-foreground">{c.typed}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {result === null ? "Checking" : result === "correct" ? "Counted" : "Not counted"}
            </span>
            {result !== null && result !== "correct" ? (
              <Button type="button" variant="quiet" onClick={() => onClaim(key)}>
                I was right
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TypedQuestion({
  front,
  back,
  check,
  onSubmit,
  onContinue,
}: {
  front: string;
  back: string;
  check: TypedCheck | null;
  onSubmit: (typed: string) => void;
  /** `claim` = the learner says they were right ("I was right"). */
  onContinue: (claim: boolean) => void;
}) {
  const [typed, setTyped] = useState("");
  const submitted = check !== null;
  const checking = submitted && check.verdict === null;
  const result: ReviewResult | null = check?.verdict?.result ?? null;
  const answer = check?.typed ?? typed;

  useEffect(() => {
    if (!submitted) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onContinue(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ui = result ? VERDICT_UI[result] : null;
  const Icon = ui?.icon;

  return (
    <>
      <div className="flex min-h-32 flex-col justify-center rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:min-h-48 sm:px-8">
        <CardFaceBlock content={front} size="card" align="center" />
      </div>
      {!submitted ? (
        <form
          className="mt-3 flex flex-col gap-2 sm:mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim().length > 0) onSubmit(typed);
          }}
        >
          {/* ui-exception: a recall answer is graded against the card; mic and agent actions would answer for the learner. */}
          <Input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type the answer"
            aria-label="Your answer"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="quiet"
              className="flex-1 sm:flex-none"
              onClick={() => onSubmit("")}
            >
              Don&apos;t know
            </Button>
            <Button
              iconEnd={<ArrowRight />}
              variant="primary"
              type="submit"
              className="flex-1"
              disabled={typed.trim().length === 0}
            >
              Check
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:mt-4">
          {checking ? (
            // No verdict until the meaning check lands — and no waiting for
            // it either: Continue works now and the verdict follows.
            <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span>Checking meaning</span>
            </div>
          ) : ui && Icon ? (
            <div className={cn("rounded-xl border px-4 py-3", ui.banner)}>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-base font-semibold">{ui.label}</span>
              </div>
              {check?.verdict?.reason ? (
                <p className="mt-1 text-sm opacity-90">{check.verdict.reason}</p>
              ) : null}
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">Answer</div>
            <CardFaceBlock content={back} align="start" />
            <div className="mt-2.5 border-t border-border pt-2.5">
              <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">You</div>
              <p className={cn("break-words text-sm", answer ? "text-foreground" : "text-muted-foreground")}>
                {answer || "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {result !== "correct" && answer.trim() !== "" ? (
              <Button
                type="button"
                variant="quiet"
                className="flex-1 sm:flex-none"
                onClick={() => onContinue(true)}
              >
                I was right
              </Button>
            ) : null}
            <Button
              iconEnd={<ArrowRight />}
              variant="primary"
              className="flex-1"
              onClick={() => onContinue(false)}
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
