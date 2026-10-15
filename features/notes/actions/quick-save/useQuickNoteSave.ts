"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllNotesList,
  selectNotesListStatus,
  selectNotesListError,
} from "@/features/notes/redux/selectors";
import {
  fetchNotesList,
  createNewNote,
  saveNoteField,
} from "@/features/notes/redux/thunks";
import type { Note } from "@/features/notes/types";
import type { NoteRecord } from "@/features/notes/redux/notes.types";
import { useToastManager } from "@/hooks/useToastManager";
import {
  useRefinableContent,
  type RefinableContent,
} from "@/components/content-refine/useRefinableContent";
import { payloadSafetyStore } from "@ai-matrx/kit/payload-safety";
import { runTrackedRequest } from "@/lib/redux/net/runTrackedRequest";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

// Vocabulary lives in a pure module so the surface manifest can import the
// same constants this hook validates against (see quickNoteSaveVocabulary).
export type { SaveMode, UpdateMethod } from "./quickNoteSaveVocabulary";
import type { SaveMode, UpdateMethod } from "./quickNoteSaveVocabulary";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useNoteHomes } from "@/features/notes/homes/useNoteHomes";
import { resolveHomeScopeId } from "@/features/scopes/homes/setHome";

export interface UseQuickNoteSaveArgs {
  initialContent: string;
  /** A code-owned bucket ("Chat Saves", "Voice Notes"…): stamped as a TAG on
   *  the new note. The home stays the database default unless one is picked. */
  bucketTag?: string;
  /** Pre-filled note title (e.g. chat save: "My topic Message 4"). */
  defaultNoteName?: string;
}

function buildTimestampNoteName(): string {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Quick Note - ${date} at ${time}`;
}

export function useQuickNoteSave({
  initialContent: rawInitialContent,
  bucketTag,
  defaultNoteName: initialNoteName,
}: UseQuickNoteSaveArgs) {
  const dispatch = useAppDispatch();
  const toast = useToastManager("notes");

  // Content transforms (strip-thinking, trim, edit override) live in the
  // shared refine primitive (it coerces null/undefined content at the
  // boundary); this hook owns only the note-destination state.
  const refine: RefinableContent = useRefinableContent({
    initialContent: rawInitialContent,
  });
  const { workingContent, initialContent } = refine;

  const allNotes = useAppSelector(selectAllNotesList);
  // Homes (item homes): "" = the General of the active organization.
  const homes = useNoteHomes();
  const allHomes = useMemo(
    () => homes.homes.map((h) => ({ scopeId: h.scopeId, label: homes.labelOf(h.scopeId) ?? h.name })),
    [homes],
  );
  const listStatus = useAppSelector(selectNotesListStatus);
  const listError = useAppSelector(selectNotesListError);
  const selectedOrganizationId = useAppSelector(selectOrganizationId);

  useEffect(() => {
    // `idle` only. An `error` list already shows its reason and a Try again in
    // the sidebar; re-dispatching on it here made every failure a retry loop
    // (error → fetch → error …) with no cap.
    if (listStatus === "idle") {
      dispatch(fetchNotesList({ ifIdle: true }));
    }
  }, [listStatus, dispatch]);

  // Target fields
  const [noteName, setNoteName] = useState(
    () => initialNoteName?.trim() || buildTimestampNoteName(),
  );
  const [home, setHome] = useState("");
  const [mode, setMode] = useState<SaveMode>("create");
  // Selection is stored WITH the home+mode it was made under; changing
  // either invalidates it by derivation (no setState-in-effect reset).
  const [selection, setSelection] = useState<{
    home: string;
    mode: SaveMode;
    id: string;
  } | null>(null);
  const selectedNoteId =
    selection && selection.home === home && selection.mode === mode
      ? selection.id
      : "";
  const setSelectedNoteId = useCallback(
    (id: string) => setSelection(id ? { home, mode, id } : null),
    [home, mode],
  );
  const [updateMethod, setUpdateMethod] = useState<UpdateMethod>("append");

  // Save lifecycle
  const [isSaving, setIsSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<Note | null>(null);

  const notesInHome = useMemo(
    () => (home ? allNotes.filter((n) => n.home_scope_id === home) : allNotes),
    [allNotes, home],
  );
  const homeLabel = home ? (homes.labelOf(home) ?? "Home") : "General";

  const selectedNote: NoteRecord | undefined = useMemo(
    () => allNotes.find((n) => n.id === selectedNoteId),
    [allNotes, selectedNoteId],
  );

  const save = useCallback(async (): Promise<Note | null> => {
    if (!workingContent.trim()) {
      toast.error("Content cannot be empty");
      return null;
    }

    if (mode === "update" && (!selectedNoteId || !selectedNote)) {
      toast.error("Please select a note to update");
      return null;
    }
    // Narrowed once, here — `selectedNote` is proven defined in update mode by
    // the guard above, but that guard is in `save`'s outer scope while the
    // read below happens inside a nested `run` closure, which TS can't narrow
    // through. Capture the checked value instead of re-asserting it later.
    const selectedNoteForUpdate = mode === "update" ? selectedNote : undefined;

    const requestId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const trimmedContent = workingContent.trim();
    const isCreate = mode === "create";
    // Existing notes keep their authorized stored organization; an unrelated
    // active selection must never block an update or open a destination picker.
    let organizationId: string;
    if (isCreate) {
      try {
        organizationId = await ensureOrgId(home ? (homes.byId.get(home)?.organizationId ?? null) : null);
      } catch (error) {
        throw error;
      }
    } else {
      if (!selectedNoteForUpdate?.organization_id) {
        toast.error(
          "This note is missing its organization. Reload or reopen it before updating.",
        );
        return null;
      }
      organizationId = selectedNoteForUpdate.organization_id;
    }
    const label = isCreate
      ? `Note: ${noteName.trim() || "Quick Note"}`
      : `Note update: ${selectedNote?.label || "note"}`;
    const routeHref =
      typeof window !== "undefined" ? window.location.pathname : "/notes";

    const payload = isCreate
      ? {
          op: "create" as const,
          label: noteName.trim() || "Quick Note",
          content: trimmedContent,
          home_scope_id: home || null,
          organization_id: organizationId ?? "",
        }
      : {
          op: "update" as const,
          noteId: selectedNoteId,
          updateMethod,
          content: trimmedContent,
        };

    const recoveryId = await payloadSafetyStore
      .savePending({
        id: requestId,
        kind: "note",
        label,
        routeHref,
        payload,
        rawUserInput: initialContent,
      })
      .catch(() => requestId);

    setIsSaving(true);
    try {
      const result = await runTrackedRequest<Note>(dispatch, {
        id: requestId,
        kind: "crud",
        label,
        recoveryId,
        run: async () => {
          if (isCreate) {
            // A chosen home that is an organization's General is left to the
            // database default; a General not created yet is created on choose.
            const picked = home ? homes.byId.get(home) : undefined;
            let homeScopeId: string | null = null;
            if (picked && !picked.isGeneral) {
              const resolved = await resolveHomeScopeId(picked.scopeId);
              if (!resolved.ok) throw new Error(resolved.message);
              homeScopeId = resolved.scopeId;
            }
            const note = await dispatch(
              createNewNote({
                label: noteName.trim() || "Quick Note",
                content: trimmedContent,
                organization_id: organizationId,
                ...(homeScopeId ? { home_scope_id: homeScopeId } : {}),
                tags: bucketTag ? [bucketTag] : [],
              }),
            ).unwrap();
            return note;
          }

          if (!selectedNoteForUpdate) {
            throw new Error("No note selected to update");
          }

          const finalContent =
            updateMethod === "append"
              ? `${selectedNoteForUpdate.content ?? ""}\n\n${trimmedContent}`.trim()
              : trimmedContent;

          await dispatch(
            saveNoteField({
              noteId: selectedNoteForUpdate.id,
              field: "content",
              value: finalContent,
            }),
          ).unwrap();

          return {
            ...selectedNoteForUpdate,
            content: finalContent,
          };
        },
      });

      if (isCreate) {
        toast.success(`Created in ${homeLabel}`);
      } else {
        toast.success(
          `Content ${updateMethod === "append" ? "appended to" : "overwrote"} ${
            selectedNote?.label || "note"
          }!`,
        );
      }
      setSavedNote(result);
      return result;
    } catch (err) {
      console.error("QuickNoteSave: save failed", err);
      toast.error("Failed to save — saved to Recovery");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    dispatch,
    toast,
    mode,
    noteName,
    home,
    homes,
    homeLabel,
    bucketTag,
    workingContent,
    initialContent,
    selectedNoteId,
    selectedNote,
    updateMethod,
  ]);

  const reset = useCallback(() => {
    refine.resetTransforms();
    setNoteName(initialNoteName?.trim() || buildTimestampNoteName());
    setHome("");
    setMode("create");
    setSelectedNoteId("");
    setUpdateMethod("append");
    setSavedNote(null);
    setIsSaving(false);
  }, [initialNoteName, refine]);

  const isSaveDisabled =
    isSaving ||
    !workingContent.trim() ||
    (mode === "update" && !selectedNoteId);

  return {
    // content transforms — the shared refine primitive, also spread flat for
    // consumers that predate it. New consumers: hand `refine` to
    // <RefinableContentEditor> instead of rebuilding toolbar/trim UI.
    refine,
    ...refine,

    // targets
    noteName,
    setNoteName,
    home,
    setHome,
    homeLabel,
    mode,
    setMode,
    selectedNoteId,
    setSelectedNoteId,
    updateMethod,
    setUpdateMethod,
    selectedNote,

    // data
    allHomes,
    notesInHome,
    // The notes-list read behind `notesInHome` (RC-B12): a
    // picker must not say "No notes here" while it is loading or
    // after it failed.
    listStatus,
    listError,
    retryList: () => {
      void dispatch(fetchNotesList());
    },

    // lifecycle
    isSaving,
    isSaveDisabled,
    savedNote,
    save,
    reset,
  };
}
