"use client";

/**
 * JudgedState — the text the decision model judged (the user turn that asked
 * the questions), loaded for one item. One component for the review queue and
 * the reference check's drill-in.
 */

import { useEffect, useState } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { loadJudgedState, type JudgedState as JudgedStateValue } from "../service";
import type { ReviewItem } from "../queue";

export function JudgedStateText({ item }: { item: ReviewItem }) {
  const { messageId, conversationId } = item;
  const key = `${messageId ?? ""}:${conversationId ?? ""}`;
  // The loaded state remembers which message it is for; a stale one shows as loading.
  const [loaded, setLoaded] = useState<{ key: string; value: JudgedStateValue } | null>(null);
  const state = loaded?.key === key ? loaded.value : null;

  useEffect(() => {
    let cancelled = false;
    loadJudgedState({ messageId, conversationId })
      .then((value) => {
        if (!cancelled) setLoaded({ key: `${messageId ?? ""}:${conversationId ?? ""}`, value });
      })
      .catch((err: unknown) => {
        console.error("[decision-review] state load failed", err);
        if (!cancelled) {
          setLoaded({ key: `${messageId ?? ""}:${conversationId ?? ""}`, value: { parts: [], visible: false } });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [messageId, conversationId]);

  if (state == null) return <RegionSkeleton shape="rows" count={2} aria-label="Loading the judged state" />;
  if (!state.visible) {
    return (
      <span className="text-muted-foreground">You can&apos;t open this conversation; only its answer shows</span>
    );
  }
  if (state.parts.length === 0) return <span className="text-muted-foreground">The turn carried no text.</span>;
  return <>{state.parts.join("\n\n")}</>;
}
