"use client";

/**
 * The homes' batch actions — the platform's one bulk bar (`useTableBulkSelection`) over the
 * Workbooks / Documents / Presentations list. A home holds ONE record type (`kind.token`), so the
 * built-ins (Favorite, Unfavorite, Add tag) run on that token as-is. Three are replaced here by id
 * because these records already have their own doors:
 *   - Favorite / Unfavorite also update the home's star cache, so the stars repaint at once.
 *   - Move to Trash goes through the kind's own service (`adapter.trash`, owner only, restorable).
 * Added: Move to project (the same picker as the row menu), one Download per format the kind
 * offers (the row menu's own download doors), and Restore when looking at Trash.
 *
 * Nothing here narrows who gets a checkbox; a row a verb can't touch is skipped and named.
 */

import { useState, type ReactNode } from "react";
import { ArrowDownToLine, FolderInput, RotateCcw, Star, StarOff, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { isServiceFailure } from "@/features/data-tables/types";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { bulkCountLabel, type EntityBulkAction } from "@/lib/entity-list/selection";
import { MoveToProjectDialog } from "../MoveToProjectDialog";
import { useFileFavorites } from "../useFileFavorites";
import type { FileKindAdapter } from "../types";
import type { HomeKind } from "./home-kinds";
import type { DatedItem } from "./recent";

type Line<Row> = DatedItem<Row>;

/** A batch of downloads opens one browser download each; this many at a time is plenty. */
const DOWNLOAD_BATCH_LIMIT = 10;

export function useFileHomeBulk<Row extends { id: string; user_id: string }>(args: {
  kind: HomeKind;
  adapter: FileKindAdapter<Row>;
  /** The table's lines (what it renders and selects). */
  rows: Line<Row>[];
  userId: string | null;
  trashed: boolean;
  reload: () => void | Promise<void>;
}) {
  const { kind, adapter, rows, userId, trashed, reload } = args;
  const noun = kind.startNoun;
  const { setStarred } = useFileFavorites(kind.entityType);
  const [moveRows, setMoveRows] = useState<Line<Row>[] | null>(null);
  const refresh = () => void reload();
  const idOf = (l: Line<Row>) => l.item.id;
  const nameOf = (l: Line<Row>) => adapter.nameOf(l.item.row);
  const ownerOnly = (l: Line<Row> | undefined, verb: string) => {
    if (l && userId !== null && l.item.ownerId !== userId) throw new Error(`only the owner can ${verb}`);
  };
  const failed = (res: unknown) => {
    if (isServiceFailure(res as never)) throw new Error((res as { error: string }).error);
  };

  const star = (favorite: boolean): EntityBulkAction<Line<Row>> => ({
    id: favorite ? "favorite" : "unfavorite",
    label: favorite ? "Favorite" : "Unfavorite",
    icon: favorite ? Star : StarOff,
    run: (selection) =>
      runPerRow(
        selection,
        (id) => setStarred(id, favorite),
        { done: favorite ? "Added to favorites" : "Removed from favorites", noun, labelOf: nameOf },
        idOf,
      ),
  });

  const trash: EntityBulkAction<Line<Row>> = {
    id: "move-to-trash",
    label: "Move to Trash",
    icon: Trash2,
    variant: "destructive",
    confirm: (selection) => ({
      title: `Move ${bulkCountLabel(selection.count, noun)} to Trash?`,
      description: "They can be restored from Trash. Any you don't own are skipped and named.",
      confirmLabel: "Move to Trash",
      variant: "destructive",
    }),
    run: (selection) =>
      runPerRow(
        selection,
        async (id, row) => {
          ownerOnly(row, "move this to Trash");
          failed(await adapter.trash(id));
        },
        { done: "Moved to Trash", noun, labelOf: nameOf },
        idOf,
      ),
  };

  const restore: EntityBulkAction<Line<Row>> = {
    id: "restore",
    label: "Restore",
    icon: RotateCcw,
    run: (selection) =>
      runPerRow(
        selection,
        async (id, row) => {
          ownerOnly(row, "restore this");
          failed(await adapter.restore(id));
        },
        { done: "Restored", noun, labelOf: nameOf },
        idOf,
      ),
  };

  const move: EntityBulkAction<Line<Row>> = {
    id: "move-to-project",
    label: "Move to project",
    icon: FolderInput,
    run: (selection) => {
      // The picker is a dialog; it does the work and clears the selection itself.
      setMoveRows(selection.rows);
    },
  };

  // One Download per format the kind offers (labels don't depend on the record).
  const downloads: EntityBulkAction<Line<Row>>[] = adapter.downloads("", "").map((format) => ({
    id: `download-${format.label}`,
    label: `Download ${format.label}`,
    icon: ArrowDownToLine,
    run: (selection) => {
      if (selection.count > DOWNLOAD_BATCH_LIMIT)
        throw new Error(`Download up to ${DOWNLOAD_BATCH_LIMIT} at a time — ${selection.count} are selected.`);
      return runPerRow(
        selection,
        async (id, row) => {
          const one = adapter.downloads(id, row ? nameOf(row) : id).find((d) => d.label === format.label);
          if (!one) throw new Error("not available for this one");
          await one.run();
        },
        { done: `Downloaded ${format.label}`, noun, labelOf: nameOf },
        idOf,
      );
    },
  }));

  const bulk = useTableBulkSelection<Line<Row>>({
    token: kind.token,
    noun,
    rows,
    getRowId: idOf,
    getRowName: nameOf,
    actions: trashed ? [restore] : [star(true), star(false), move, ...downloads, trash],
    standardBulkActions: trashed ? false : undefined,
    onRefresh: refresh,
  });

  const dialog: ReactNode = moveRows ? (
    <MoveToProjectDialog
      name={moveRows.length === 1 ? nameOf(moveRows[0]) : bulkCountLabel(moveRows.length, noun)}
      currentProjectId={moveRows.length === 1 ? adapter.projectIdOf(moveRows[0].item.row) : null}
      onClose={() => setMoveRows(null)}
      onMove={async (projectId, projectName) => {
        const picked = moveRows;
        try {
          const result = await runPerRow(
            { mode: "ids", ids: picked.map(idOf), rows: picked, count: picked.length } as never,
            async (id, row) => {
              ownerOnly(row, "move this");
              failed(await adapter.move(id, projectId));
            },
            { done: projectId ? `Moved to ${projectName ?? "the project"}` : "Removed from their project", noun, labelOf: nameOf },
            idOf,
          );
          toast.success(result.message ?? "Moved");
          bulk.clear();
          refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      }}
    />
  ) : null;

  return { selection: bulk.selection, clear: bulk.clear, dialog };
}
