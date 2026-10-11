"use client";

// features/education/tutor/components/TutorSourceStrip.tsx
//
// One line above the tutor conversation naming WHICH Sources the tutor
// searches when it was opened from a kit / deck / guide / note / map / quiz
// (`seed.studyContext`, resolved by `sourceScope.ts`). Every Source is a chip
// that opens it (THE DOOR LAW); two filter chips switch between "this
// material" and "All my material". Renders nothing without a study context,
// so the standalone tutor is unchanged.

import Link from "next/link";
import { BookOpen, FileText, Library } from "lucide-react";
import { Chip } from "@ai-matrx/design-system/controls";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import type { TutorScopedSource } from "../sourceScope";

export interface TutorSourceStripProps {
  /** The place's own name ("Cell biology"); the scope chip's label. */
  contextTitle: string | undefined;
  /** null while resolving. */
  sources: TutorScopedSource[] | null;
  /** The read failure, when the Sources could not be read. */
  error: unknown;
  widened: boolean;
  onWidenChange: (widened: boolean) => void;
}

export function TutorSourceStrip({
  contextTitle,
  sources,
  error,
  widened,
  onWidenChange,
}: TutorSourceStripProps) {
  const failed = error != null;
  const hasOwn = !failed && (sources?.length ?? 0) > 0;
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-border bg-card/40 px-4 py-1"
      data-testid="tutor-source-strip"
    >
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="shrink-0 text-xs text-muted-foreground">Answering from</span>
      <Chip asChild pressed={!widened} label={contextTitle || "This material"}>
        <button type="button" onClick={() => onWidenChange(false)} />
      </Chip>
      <Chip asChild pressed={widened} icon={<Library />} label="All my material">
        <button type="button" onClick={() => onWidenChange(true)} />
      </Chip>
      {!widened && sources === null && !failed && (
        <span className="shrink-0 text-xs text-muted-foreground">Finding sources…</span>
      )}
      {!widened && failed && (
        <span className="shrink-0 text-xs text-destructive-ink">
          Couldn&apos;t read these sources <ErrorAlchemyMenu error={error} />
        </span>
      )}
      {!widened && sources !== null && !hasOwn && !failed && (
        <span className="shrink-0 text-xs text-muted-foreground">No sources here, searching all</span>
      )}
      {!widened &&
        hasOwn &&
        sources?.map((s) => {
          const Icon = tryGetEntityInfo(s.entityType)?.Icon ?? FileText;
          return (
            <Chip key={`${s.entityType}:${s.entityId}`} asChild icon={<Icon />} label={s.title} title={`Open ${s.title}`}>
              <Link href={s.href} target="_blank" rel="noreferrer" />
            </Chip>
          );
        })}
    </div>
  );
}
