"use client";

import type { ReactNode } from "react";
import { History } from "lucide-react";
import type { CanvasKindProps } from "@ai-matrx/canvas/react";
import { Button } from "@/components/ui/button";
import { isHistorySubjectOpen, useIsHistorySubjectOpen } from "./historySubject";

/** "Document history · Q3 plan" -> "Q3 plan"; null while the tab carries no subject name. */
export function historySubjectName(title: string | null | undefined): string | null {
  const at = title?.indexOf(" · ") ?? -1;
  const name = at >= 0 ? title!.slice(at + 3).trim() : "";
  return name || null;
}

/**
 * The body of a snapshot-history tab, for ONE subject. The header names it; the versions (and their Restore
 * buttons) show only while the editor of that very subject is open. Otherwise the person sees why there is
 * nothing to restore, with a way to close the tab — never another document's versions under a generic title.
 */
export function HistorySubjectGate({
  kind,
  noun,
  subjectId,
  props,
  children,
}: {
  kind: string;
  noun: "document" | "workbook";
  subjectId: string;
  props: Pick<CanvasKindProps, "item" | "canvas">;
  children: (subject: { name: string | null; canRestore: () => boolean }) => ReactNode;
}) {
  const live = useIsHistorySubjectOpen(kind, subjectId);
  const name = historySubjectName(props.item.title);
  const label = name ? `“${name}”` : `this ${noun}`;
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background p-3" data-matrx-page-scroll="" data-history-subject={subjectId}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <History className="size-4 text-muted-foreground" />
        <span className="truncate">{name ?? `This ${noun}`}</span>
      </p>
      {live ? (
        children({ name, canRestore: () => isHistorySubjectOpen(kind, subjectId) })
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-md bg-muted p-6 text-center">
          <p className="text-sm font-medium text-foreground">{`${label} is not open`}</p>
          <p className="text-xs text-muted-foreground">{`Open the ${noun} to see its history and restore a version.`}</p>
          <Button variant="outline" onClick={() => props.canvas.close(props.item.id)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
