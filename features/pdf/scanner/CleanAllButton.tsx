"use client";

/**
 * One tap cleans every uploaded photo page for text (the `clean` enhance:
 * shadows and uneven lighting divided out, paper → white). Tapping again
 * puts every page back to its original. Optional and non-destructive —
 * per-page choices stay in the crop sheet's enhance row.
 */

import React, { useRef, useState } from "react";
import { Check, Loader2, ScanText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

import { applyEnhance } from "./enhance";
import type { UseScanSessionResult } from "./useScanSession";

/** Parallel image-op calls per batch — keeps a 30-page scan off one burst. */
const CLEAN_CONCURRENCY = 4;

export function CleanAllButton({
  session,
  className,
}: {
  session: UseScanSessionResult;
  className?: string;
}) {
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const pages = session.items.filter(
    (i) => i.kind === "image" && i.status === "uploaded" && i.fileId,
  );
  const allClean =
    pages.length > 0 && pages.every((i) => i.enhance === "clean");

  // A ref, not state: two taps in one frame must not start two runs.
  const runningRef = useRef(false);

  const run = async () => {
    if (runningRef.current) return;
    if (allClean) {
      pages.forEach((i) => session.setEnhance(i.itemId, undefined));
      return;
    }
    runningRef.current = true;
    const todo = pages.filter((i) => i.enhance !== "clean");
    // Claim every page NOW, before the first await: each shows as cleaning,
    // Save waits for the whole run, and any choice the person makes on a
    // page mid-run supersedes this run's claim on it.
    const claims = todo.map((item) => ({
      item,
      token: session.beginEnhance(item.itemId),
    }));
    let done = 0;
    let failed = 0;
    setProgress({ done, total: claims.length });
    try {
      for (let start = 0; start < claims.length; start += CLEAN_CONCURRENCY) {
        await Promise.all(
          claims
            .slice(start, start + CLEAN_CONCURRENCY)
            .map(async ({ item, token }) => {
              try {
                // Superseded while waiting its turn (re-picked, removed,
                // saved): skip the server work its result would lose.
                if (!session.isEnhanceCurrent(item.itemId, token)) return;
                const res = await applyEnhance(item.fileId as string, "clean");
                session.finishEnhance(item.itemId, token, "clean", res.fileId);
              } catch (err) {
                session.cancelEnhance(item.itemId, token);
                failed += 1;
                console.error("[pdf-scanner] clean failed", item.itemId, err);
              } finally {
                done += 1;
                setProgress({ done, total: claims.length });
              }
            }),
        );
      }
    } finally {
      runningRef.current = false;
      setProgress(null);
    }
    if (failed > 0) {
      toast.error(
        `Couldn't clean ${failed} page${failed === 1 ? "" : "s"} — kept the original.`,
      );
    }
  };

  return (
    <Button
      icon={
        progress ? (
          <Loader2 className="animate-spin" />
        ) : allClean ? (
          <Check />
        ) : (
          <ScanText />
        )
      }
      variant={allClean ? "primary" : "outline"}
      disabled={pages.length === 0 || Boolean(progress)}
      onClick={() => void run()}
      aria-pressed={allClean}
      className={className}
    >
      {progress
        ? `Cleaning ${progress.done}/${progress.total}`
        : allClean
          ? "Cleaned"
          : "Clean"}
    </Button>
  );
}
