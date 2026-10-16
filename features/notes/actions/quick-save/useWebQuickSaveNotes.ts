"use client";

// This app's notes for the chat package's Save to Notes window (`useQuickSaveNotes` seam,
// @ai-matrx/chat window-panels/windows/notes/quick-save-notes-port): the notes slice (so the
// sidebar and list see a new note at once), the item homes, and this app's ways to open a note.

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { openOutbound } from "@ai-matrx/kit/outbound";
import type { QuickSaveNotes, QuickSaveOpenHow } from "@ai-matrx/chat/window-panels/windows/notes/quick-save-notes-port";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAllNotesList, selectNotesListError, selectNotesListStatus } from "@/features/notes/redux/selectors";
import { createNewNote, fetchNotesList, saveNoteField } from "@/features/notes/redux/thunks";
import { runTrackedRequest } from "@/lib/redux/net/runTrackedRequest";
import { useNoteHomes } from "@/features/notes/homes/useNoteHomes";
import { resolveHomeScopeId } from "@/features/scopes/homes/setHome";
import { useOpenNoteInWindow } from "@/features/notes/actions/useOpenNoteInWindow";

const OPEN_WAYS: readonly QuickSaveOpenHow[] = ["newTab", "openWindow", "navigate"];

export function useWebQuickSaveNotes(): QuickSaveNotes {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const openNoteInWindow = useOpenNoteInWindow();
  const allNotes = useAppSelector(selectAllNotesList);
  const status = useAppSelector(selectNotesListStatus);
  const error = useAppSelector(selectNotesListError);
  const homesState = useNoteHomes();

  useEffect(() => {
    // `idle` only: an `error` list already shows its reason and a Try again; re-dispatching on it
    // made every failure a retry loop.
    if (status === "idle") void dispatch(fetchNotesList({ ifIdle: true }));
  }, [status, dispatch]);

  const homes = useMemo(
    () =>
      homesState.homes.map((h) => ({
        scopeId: h.scopeId,
        label: homesState.labelOf(h.scopeId) ?? h.name,
        isGeneral: Boolean(homesState.byId.get(h.scopeId)?.isGeneral),
        organizationId: homesState.byId.get(h.scopeId)?.organizationId ?? null,
      })),
    [homesState],
  );

  const create = useCallback<QuickSaveNotes["create"]>(
    async ({ label, content, homeScopeId, tags, organizationId }) => {
      const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      return runTrackedRequest(dispatch, {
        id,
        kind: "crud",
        label: `Note: ${label}`,
        run: async () => {
          let home: string | null = null;
          if (homeScopeId) {
            // A General not created yet is created on choose.
            const resolved = await resolveHomeScopeId(homeScopeId);
            if (!resolved.ok) throw new Error(resolved.message);
            home = resolved.scopeId;
          }
          const note = await dispatch(
            createNewNote({ label, content, organization_id: organizationId, ...(home ? { home_scope_id: home } : {}), tags }),
          ).unwrap();
          return { id: note.id, label: note.label, content: note.content, home_scope_id: note.home_scope_id ?? null, organization_id: note.organization_id ?? null };
        },
      });
    },
    [dispatch],
  );

  const readContent = useCallback<QuickSaveNotes["readContent"]>(
    async (noteId) => allNotes.find((n) => n.id === noteId)?.content ?? "",
    [allNotes],
  );

  const updateContent = useCallback<QuickSaveNotes["updateContent"]>(
    async (noteId, content) => {
      const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await runTrackedRequest(dispatch, {
        id,
        kind: "crud",
        label: "Note update",
        run: () => dispatch(saveNoteField({ noteId, field: "content", value: content })).unwrap(),
      });
    },
    [dispatch],
  );

  const open = useCallback<QuickSaveNotes["open"]>(
    (noteId, how) => {
      if (how === "newTab") openOutbound(`/notes/${noteId}`, "_blank", "noopener");
      else if (how === "navigate") router.push(`/notes/${noteId}`);
      else openNoteInWindow({ noteId });
    },
    [router, openNoteInWindow],
  );

  const notes = useMemo(
    () => allNotes.map((n) => ({ id: n.id, label: n.label, content: n.content, home_scope_id: n.home_scope_id ?? null, organization_id: n.organization_id ?? null })),
    [allNotes],
  );

  return useMemo(
    () => ({
      notes,
      status,
      error,
      retry: () => void dispatch(fetchNotesList()),
      homes,
      create,
      readContent,
      updateContent,
      open,
      openWays: OPEN_WAYS,
    }),
    [notes, status, error, dispatch, homes, create, readContent, updateContent, open],
  );
}
