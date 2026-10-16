"use client";

/**
 * What a Univer editor shows from the moment its engine mounts until its FIRST frame is painted.
 *
 * Univer draws its chrome (column-header strip, formula bar) as soon as it is created, but the grid
 * only exists once the saved snapshot has been read and the workbook created — on a slow read that
 * is seconds of a half-drawn editor (no gridlines, a garbled header strip). The cover sits over the
 * engine's container for exactly that window and goes away only after the engine reports ready AND a
 * frame has been painted, so a person never sees the half-drawn state. Same box as the editor, so
 * nothing shifts when it leaves.
 */

import { useEffect, useState } from "react";
import { Skeleton } from "@ai-matrx/design-system";

/** True once `ready` has held through two animation frames (the engine's first paint). */
export function useFirstPaint(ready: boolean): boolean {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (!ready) return undefined;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPainted(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [ready]);
  return ready && painted;
}

export function EditorBootCover({ label }: { label: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      data-editor-boot-cover
      className="absolute inset-0 z-10 flex flex-col gap-2 bg-card p-2"
    >
      <Skeleton className="h-7 w-full" />
      <Skeleton className="min-h-0 w-full flex-1" />
    </div>
  );
}
