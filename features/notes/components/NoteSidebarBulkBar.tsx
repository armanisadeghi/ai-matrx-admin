"use client";

/**
 * NoteSidebarBulkBar — compact bulk-action bar shown in the notes sidebar
 * while selection mode is active. It renders the moment selection mode is
 * entered (docked at the TOP, just below the toolbar) so the UI doesn't shift
 * when the first note is checked; actions are disabled until >=1 note is
 * selected.
 *
 * The sidebar keeps its own selection state; the ACTIONS are the platform's
 * shared `EntityBulkActions` (lib/entity-list) fed by `buildNoteBulkActions`,
 * so confirms, pending state, named refusals and toasts are the shared ones.
 * This file owns only the select-all / count / exit chrome and the home picker.
 */

import { useState } from "react";
import { CheckSquare, Square, X } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { SimpleTooltip } from "@/components/matrx/Tooltip";
import { EntityBulkActions } from "@/lib/entity-list/components/EntityBulkBar";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";
import type { NoteRecord } from "../redux/notes.types";
import { HomePickerDialog } from "../homes/HomePicker";
import { buildNoteBulkActions } from "./noteBulkActions";

interface NoteSidebarBulkBarProps {
  instanceId: string;
  selectedNotes: NoteRecord[];
  openTabIds: string[] | undefined;
  /** Exit selection mode entirely (clears selection). */
  onClear: () => void;
  /** True when every selectable (visible) note is already selected. */
  allVisibleSelected: boolean;
  /** Select all visible notes, or clear if all are already selected. */
  onToggleSelectAll: () => void;
  /** How many notes are selectable in the current view (for the select-all tooltip). */
  selectableCount: number;
}

export function NoteSidebarBulkBar({
  instanceId,
  selectedNotes,
  openTabIds,
  onClear,
  allVisibleSelected,
  onToggleSelectAll,
  selectableCount,
}: NoteSidebarBulkBarProps) {
  const dispatch = useAppDispatch();
  const [moveOpen, setMoveOpen] = useState(false);

  const count = selectedNotes.length;
  const hasAny = count > 0;

  const actions = buildNoteBulkActions({
    dispatch,
    instanceId,
    openTabIds,
    onClear,
    openMove: () => setMoveOpen(true),
  });

  const build = (): EntityBulkSelection<NoteRecord> => ({
    mode: "ids",
    ids: selectedNotes.map((n) => n.id),
    rows: selectedNotes,
    count,
    filter: {
      scope: { kind: "all" },
      orgId: null,
      search: "",
      deep: false,
      archived: "active",
      filters: {},
    },
  });

  const btn =
    "flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:cursor-not-allowed [&_svg]:w-3.5 [&_svg]:h-3.5";

  return (
    <>
      <div
        className="shrink-0 flex flex-col gap-1 px-2 py-1.5 border-b border-border/30 bg-accent/40"
        role="toolbar"
        aria-label="Bulk note actions"
      >
        <div className="flex items-center gap-0.5">
          <SimpleTooltip
            text={
              allVisibleSelected
                ? "Clear selection"
                : `Select all ${selectableCount} visible`
            }
          >
            <button
              type="button"
              onClick={onToggleSelectAll}
              disabled={selectableCount === 0}
              className={cn(btn, "text-foreground/70")}
              aria-pressed={allVisibleSelected}
            >
              {allVisibleSelected ? <CheckSquare /> : <Square />}
            </button>
          </SimpleTooltip>

          <span className="min-w-[4.5rem] px-1 text-[0.6875rem] font-medium tabular-nums text-foreground">
            {hasAny ? `${count} selected` : "Select notes"}
          </span>

          <div className="flex-1" />
          <SimpleTooltip text="Exit selection mode">
            <button
              type="button"
              onClick={onClear}
              className={cn(btn, "text-foreground/70")}
            >
              <X />
            </button>
          </SimpleTooltip>
        </div>

        {/* Disabled as a group until a note is checked. */}
        <fieldset
          disabled={!hasAny}
          className="m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0 disabled:opacity-50"
        >
          <EntityBulkActions
            actions={actions}
            selection={{ build, clear: onClear, count }}
            noun="note"
            onRemoveRows={() => {}}
            onRefresh={() => {}}
          />
        </fieldset>
      </div>
      {/* Move to… — one home picker; a selection spanning organizations
          moves each note through moveNoteToHome (organization follows). */}
      <HomePickerDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        noteIds={selectedNotes.map((note) => note.id)}
        onMoved={onClear}
      />
    </>
  );
}
