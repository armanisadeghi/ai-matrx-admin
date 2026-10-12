"use client";

/**
 * The marks beside an open file's title (Google Docs / Sheets): Star and Move.
 * Same adapter + ops as the File menu and the lists — never a second path.
 */

import { useState } from "react";
import { FolderInput, Star } from "lucide-react";

import { useFileFavorites } from "./useFileFavorites";
import { MoveToProjectDialog } from "./MoveToProjectDialog";
import { moveRecord } from "./ops";
import type { FileKindAdapter } from "./types";
import { cn } from "@/lib/utils";

const MARK =
  "flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground";

export function FileTitleMarks<Row extends { id: string; user_id: string }>({
  adapter,
  row,
  canManage,
  onProjectMoved,
}: {
  adapter: FileKindAdapter<Row>;
  row: Row;
  canManage: boolean;
  onProjectMoved?: (projectId: string | null) => void;
}) {
  const { isStarred, toggle } = useFileFavorites(adapter.entityType);
  const [moveOpen, setMoveOpen] = useState(false);
  const starred = isStarred(row.id);
  const base = adapter as unknown as FileKindAdapter<{ id: string; user_id: string }>;
  const name = adapter.nameOf(row);

  return (
    <>
      {/* ui-exception: Google's 28px title marks, round and borderless beside the title. */}
      <button
        type="button"
        className={MARK}
        aria-label={starred ? "Remove star" : "Star"}
        title={starred ? "Remove star" : "Star"}
        aria-pressed={starred}
        onClick={() => void toggle(row.id)}
      >
        <Star className={cn("size-[18px]", starred && "fill-current text-amber-500")} />
      </button>
      {canManage ? (
        <button
          type="button"
          className={MARK}
          aria-label="Move"
          title="Move"
          onClick={() => setMoveOpen(true)}
        >
          <FolderInput className="size-[18px]" />
        </button>
      ) : null}
      {moveOpen ? (
        <MoveToProjectDialog
          name={name}
          currentProjectId={adapter.projectIdOf(row)}
          onClose={() => setMoveOpen(false)}
          onMove={async (projectId, projectName) => {
            if (await moveRecord(base, row.id, projectId, projectName)) onProjectMoved?.(projectId);
          }}
        />
      ) : null}
    </>
  );
}
