"use client";

/**
 * One tap cleans every uploaded photo page for text (the `clean` enhance:
 * shadows and uneven lighting divided out, paper → white). Tapping again
 * puts every page back to its original. Optional and non-destructive —
 * per-page choices stay in the crop sheet's enhance row.
 */

import React, { useState } from "react";
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

  const run = async () => {
    if (progress) return;
    if (allClean) {
      pages.forEach((i) => session.setEnhance(i.itemId, undefined));
      return;
    }
    const todo = pages.filter((i) => i.enhance !== "clean");
    let done = 0;
    let failed = 0;
    setProgress({ done, total: todo.length });
    for (let start = 0; start < todo.length; start += CLEAN_CONCURRENCY) {
      await Promise.all(
        todo.slice(start, start + CLEAN_CONCURRENCY).map(async (item) => {
          try {
            const res = await applyEnhance(item.fileId as string, "clean");
            session.setEnhance(item.itemId, "clean", res.fileId);
          } catch (err) {
            failed += 1;
            console.error("[pdf-scanner] clean failed", item.itemId, err);
          } finally {
            done += 1;
            setProgress({ done, total: todo.length });
          }
        }),
      );
    }
    setProgress(null);
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
