// features/flashcards/components/study/MatchingCardPlayer.tsx
//
// The study interaction for a `matching` card variant: tap a term on the left,
// tap its match on the right. Correct pairs lock in green; a wrong tap flashes
// red and counts a miss. When every pair is matched the card self-grades —
// 0 misses → correct, any misses → partial — and hands the result up to the
// deck's canonical grade path (study spine). No flip, no manual grade row.
//
// Matching is INDEX-keyed, not text-keyed: duplicate lefts or rights
// ({Madrid→Spain, Barcelona→Spain}) are distinct buttons that each lock
// independently — a correct tap is any right whose TEXT equals the selected
// pair's right, but only the tapped button locks. Empty/malformed cards
// (matchingPairs() filtered everything out) render a calm no-pairs notice
// instead of a dead 0/0 board.
//
// React Compiler is on: no manual useMemo / useCallback / React.memo.

"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewResult } from "../../types";
import type { MatchingPair } from "../../utils/cardVariants";
import { Button as ControlButton } from "@ai-matrx/design-system/controls";

/** Deterministic-per-mount shuffle (Fisher–Yates on a copy). */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Multi-line clamp that still wraps long terms (no unanswerable ellipses). */
const CLAMP_3 =
  "min-w-0 break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden";

export function MatchingCardPlayer({
  cardId,
  prompt,
  pairs,
  disabled = false,
  onComplete,
}: {
  cardId: string;
  prompt: string;
  pairs: MatchingPair[];
  disabled?: boolean;
  /**
   * Fired when all pairs are matched. May return a promise; resolving `false`
   * (or rejecting) means the grade WRITE failed — the player stays
   * un-latched and offers a retry instead of silently swallowing it.
   */
  onComplete: (result: ReviewResult) => void | Promise<boolean | void>;
}) {
  // Re-key all interaction state on the card so navigating to a new matching
  // card resets cleanly (fresh shuffle, cleared selection, zero misses).
  // Everything is keyed by PAIR INDEX so duplicate texts stay distinct.
  const [rightOrder, setRightOrder] = useState<number[]>(() =>
    shuffle(pairs.map((_, i) => i)),
  );
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  /** rightIdx → leftIdx it was matched with (for the confirmation label). */
  const [matches, setMatches] = useState<Map<number, number>>(new Map());
  const [wrongRight, setWrongRight] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);
  const [gradeFailed, setGradeFailed] = useState(false);
  const completedRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    setRightOrder(shuffle(pairs.map((_, i) => i)));
    setSelectedLeft(null);
    setMatches(new Map());
    setWrongRight(null);
    setMisses(0);
    setGradeFailed(false);
    completedRef.current = false;
    submittingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const matchedLefts = new Set(matches.values());
  const allMatched = pairs.length > 0 && matches.size === pairs.length;

  const submitCompletion = async (): Promise<void> => {
    if (completedRef.current || submittingRef.current) return;
    submittingRef.current = true;
    setGradeFailed(false);
    try {
      const res = await onComplete(misses === 0 ? "correct" : "partial");
      if (res === false) {
        // Loud recovery: the grade write failed (the study hook already
        // toasted) — stay un-latched and offer a retry.
        setGradeFailed(true);
      } else {
        completedRef.current = true;
      }
    } catch {
      setGradeFailed(true);
    } finally {
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    if (allMatched) void submitCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  const pickRight = (rightIdx: number): void => {
    if (disabled || selectedLeft === null || matches.has(rightIdx)) return;
    // Correct if the tapped right's TEXT equals the selected pair's right —
    // duplicate rights are interchangeable — but only the tapped button locks.
    if (pairs[rightIdx].right === pairs[selectedLeft].right) {
      setMatches((prev) => new Map(prev).set(rightIdx, selectedLeft));
      setSelectedLeft(null);
    } else {
      setMisses((m) => m + 1);
      setWrongRight(rightIdx);
      window.setTimeout(() => setWrongRight(null), 400);
    }
  };

  // Malformed card (no well-formed pairs) — calm notice, never a dead board.
  // The deck's navigation stays available so the learner can advance past it.
  if (pairs.length === 0) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-6 text-center">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{prompt}</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            This matching card has no pairs to play. Use Next to continue, and
            consider editing the card to add its pairs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 rounded-lg border border-border bg-card p-3 text-center">
        <p className="text-sm font-medium text-foreground">{prompt}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tap a term, then tap its match. {matches.size}/{pairs.length} matched
          {misses > 0 ? ` · ${misses} miss${misses === 1 ? "" : "es"}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Left column — terms, in order. */}
        <div className="flex flex-col gap-1.5">
          {pairs.map((p, leftIdx) => {
            const done = matchedLefts.has(leftIdx);
            const selected = selectedLeft === leftIdx;
            return (
              <button
                key={`l-${leftIdx}`}
                type="button"
                disabled={disabled || done}
                onClick={() => setSelectedLeft(selected ? null : leftIdx)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  done
                    ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
                    : selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                <span className={CLAMP_3}>{p.left}</span>
                {done && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Right column — matches, shuffled by pair index (duplicates distinct). */}
        <div className="flex flex-col gap-1.5">
          {rightOrder.map((rightIdx) => {
            const done = matches.has(rightIdx);
            const wrong = wrongRight === rightIdx;
            const matchedLeftIdx = matches.get(rightIdx);
            return (
              <button
                key={`r-${rightIdx}`}
                type="button"
                disabled={disabled || done}
                onClick={() => pickRight(rightIdx)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  done
                    ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
                    : wrong
                      ? "border-red-400 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300"
                      : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                <span className={CLAMP_3}>{pairs[rightIdx].right}</span>
                {done && matchedLeftIdx != null && (
                  <span className="shrink-0 text-[10px] text-green-600 dark:text-green-400">
                    {pairs[matchedLeftIdx].left}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {gradeFailed && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <span>All matched, but recording your grade failed.</span>
          <ControlButton variant="quiet" type="button"
            onClick={() => void submitCompletion()} className="shrink-0" icon={<RotateCcw />}>Retry</ControlButton>
        </div>
      )}
    </div>
  );
}
