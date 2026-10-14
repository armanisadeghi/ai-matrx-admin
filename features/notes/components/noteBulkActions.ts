// features/notes/components/noteBulkActions.ts
//
// The notes sidebar's batch actions, declared as the platform's shared
// `EntityBulkAction`s so notes renders them through `EntityBulkActions`
// (lib/entity-list) instead of its own button row. Every `run` calls the SAME
// notes service/thunk the hand-built bar called; per-row verbs go through
// `runPerRow`, so a refused note is skipped and NAMED instead of tallied.
// The sidebar keeps its own selection state (it is not a MatrxDataTable).

import { Database, Download, House, Share2, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { ingestSource } from "@/features/rag/api/ingest";
import {
  bulkCountLabel,
  type EntityBulkAction,
} from "@/lib/entity-list/selection";
import {
  mergeBulkActions,
  runPerRow,
  standardBulkActionsFor,
} from "@/lib/entity-list/standardBulkActions";
import type { AppDispatch } from "@/lib/redux/store";
import { removeInstanceTab } from "../redux/slice";
import { deleteNote, ensureNoteBodiesLoaded, restoreNote } from "../redux/thunks";
import type { NoteRecord } from "../redux/notes.types";
import { isNoteContentEmpty } from "../utils/noteUtils";
import {
  downloadNoteAsMarkdown,
  downloadNotesAsMarkdownZip,
} from "../utils/exportNotesMarkdown";
import { openNoteShareModal } from "./note-actions/noteMenuRegistry";

const NOUN = "note";
const rowIdOf = (note: NoteRecord) => note.id;
const labelOf = (note: NoteRecord) => note.label;

export function buildNoteBulkActions(args: {
  dispatch: AppDispatch;
  instanceId: string;
  openTabIds: string[] | undefined;
  /** Leave selection mode (clears the selection). */
  onClear: () => void;
  /** Open the Move-to-home picker for the current selection. */
  openMove: () => void;
}): EntityBulkAction<NoteRecord>[] {
  const { dispatch, instanceId, openTabIds, onClear, openMove } = args;

  const own: EntityBulkAction<NoteRecord>[] = [
    {
      id: "move-home",
      label: "Move to…",
      icon: House,
      // The picker is a dialog: resolving with nothing keeps the selection;
      // the dialog's own onMoved clears it.
      run: () => {
        openMove();
      },
    },
    {
      id: "add-to-knowledge",
      label: "Add to knowledge base",
      icon: Database,
      run: async (selection) => {
        const result = await runPerRow(
          selection,
          async (id, row) => {
            await ingestSource("note", id, {
              organizationId: row?.organization_id,
            });
          },
          { done: "Added to knowledge base", noun: NOUN, labelOf },
          rowIdOf,
        );
        return { ...result, keepSelection: true };
      },
    },
    {
      id: "export-markdown",
      label: "Export as Markdown",
      icon: Download,
      run: async (selection) => {
        // List rows carry only a preview (audit N-24): read the bodies first.
        const full = await dispatch(
          ensureNoteBodiesLoaded(selection.ids),
        ).unwrap();
        if (full.length === 1) {
          downloadNoteAsMarkdown(full[0]);
        } else {
          await downloadNotesAsMarkdownZip(full, "notes-export.zip");
        }
        return {
          message: `Exported ${bulkCountLabel(full.length, NOUN)} as Markdown.`,
          keepSelection: true,
        };
      },
    },
    {
      id: "share",
      label: "Share",
      icon: Share2,
      run: (selection) => {
        if (selection.rows.length !== 1) {
          throw new Error("Select exactly one note to share.");
        }
        const note = selection.rows[0];
        void openNoteShareModal(dispatch, note.id, note.label);
      },
    },
    {
      // Notes' own delete, not the shared archiveRecord door: it also removes
      // open tabs, handles never-saved drafts, refuses read-only sharees by
      // name and updates the notes slice, with Undo.
      id: "move-to-trash",
      label: "Move to Trash",
      icon: Trash2,
      variant: "destructive",
      run: async (selection) => {
        // "Empty" is judged on the BODY; list rows carry only a preview
        // (audit N-24), so read the bodies before skipping the confirmation.
        let withBodies: NoteRecord[];
        try {
          withBodies = await dispatch(
            ensureNoteBodiesLoaded(selection.ids),
          ).unwrap();
        } catch {
          throw new Error(
            "Could not load these notes to check them before deleting. Try again.",
          );
        }
        if (!withBodies.every((n) => isNoteContentEmpty(n.content))) {
          const count = selection.count;
          const ok = await confirm({
            title: `Move ${count} note${count === 1 ? "" : "s"} to Trash?`,
            description: `Selected note${count === 1 ? "" : "s"} will be moved to trash. You can restore ${count === 1 ? "it" : "them"} later.`,
            confirmLabel: "Move to Trash",
            variant: "destructive",
          });
          if (!ok) return;
        }
        for (const id of selection.ids) {
          if (openTabIds?.includes(id)) {
            dispatch(removeInstanceTab({ instanceId, noteId: id }));
          }
        }
        const result = await runPerRow(
          selection,
          async (id) => {
            await dispatch(deleteNote(id)).unwrap();
          },
          { done: "Moved to Trash", noun: NOUN, labelOf, removesRows: true },
          rowIdOf,
        );
        // The success line carries Undo, which the shared toast cannot, so it
        // is raised here and the selection mode is left; returning nothing
        // keeps the shell from raising a second toast.
        const deletedIds = result.removedIds ?? selection.ids;
        toast.success(result.message ?? "Moved to Trash.", {
          action: {
            label: "Undo",
            onClick: () => {
              for (const id of deletedIds) dispatch(restoreNote(id));
              toast.success("Notes restored");
            },
          },
        });
        onClear();
      },
    },
  ];

  // Shared built-ins notes lacks: Add tag. Favorites are not shown in notes,
  // and Trash is replaced above by id.
  const standard = standardBulkActionsFor<NoteRecord>({
    token: "note",
    noun: NOUN,
    rowIdOf,
    labelOf,
    config: undefined,
    favoritesShown: false,
  });
  return mergeBulkActions(own, standard);
}
