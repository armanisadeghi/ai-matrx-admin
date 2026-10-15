"use client";

/**
 * The place card's "Reviews" door — loads what people say about one place
 * INTO the card, on demand (each load spends one search of the shared Google
 * allowance, so nothing loads until it is pressed). The reviews render through
 * the canonical `place_reviews` component; a failure says so in plain words
 * with a retry, never a blank.
 */

import { useRef, useState } from "react";
import { ChevronUp, Loader2, MessageSquareText, RotateCcw } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useBackendApi } from "@/hooks/useBackendApi";
import { runSearchDoor, SEARCH_DOORS } from "@/features/search/service";
import type { SearchOutcome } from "@/features/search/types";
import { PlaceReviewsBlock } from "@/components/mardown-display/blocks/search-kinds/insight-blocks";

/** Reviews per load — a cap, matching the door's default. */
const REVIEWS_PER_LOAD = 10;

export function PlaceReviewsLoader({ placeId }: { placeId: string }) {
  const { post } = useBackendApi();
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "done"; outcome: SearchOutcome }
    | { phase: "error"; message: string }
  >({ phase: "idle" });
  const [open, setOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const load = async () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setOpen(true);
    setState({ phase: "loading" });
    try {
      const outcome = await runSearchDoor({
        post,
        endpoint: SEARCH_DOORS.reviews.endpoint,
        expectKinds: SEARCH_DOORS.reviews.kinds,
        body: { place_id: placeId, count: REVIEWS_PER_LOAD },
        signal: c.signal,
      });
      if (!c.signal.aborted) setState({ phase: "done", outcome });
    } catch (err: unknown) {
      if (c.signal.aborted) return;
      setState({
        phase: "error",
        message: err instanceof Error && err.message ? err.message : "Reviews didn't load.",
      });
    }
  };

  const onPress = () => {
    if (state.phase === "done" || state.phase === "error") {
      setOpen((v) => !v);
      return;
    }
    if (state.phase === "idle") void load();
  };

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="quiet"
        icon={
          state.phase === "loading" ? (
            <Loader2 className="animate-spin" />
          ) : open && state.phase === "done" ? (
            <ChevronUp />
          ) : (
            <MessageSquareText />
          )
        }
        pressed={open}
        disabled={state.phase === "loading"}
        onClick={onPress}
        aria-expanded={open}
      >
        Reviews
      </Button>
      {open && state.phase === "loading" && (
        <div className="mt-2 space-y-2" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}
      {open && state.phase === "error" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{state.message}</span>
          <Button variant="quiet" icon={<RotateCcw />} onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}
      {open && state.phase === "done" && (
        <PlaceReviewsBlock serverData={state.outcome.result} bare className="mt-3" />
      )}
    </div>
  );
}
