"use client";

// useNotePicker — what the Notes resource picker reads, and nothing more.
//
// It replaced `useNotes`, which downloaded EVERY note with its full body just to
// open the picker (Arman, 2026-09-29: "When I clicked 'Note' it took a long
// time … fetch the last 10 most active plus some counts"). On open it reads:
//   - the N most recently changed notes (N = knob resource_picker.notes_recent_count),
//   - every note as a body-less row, grouped by home (home_scope_id) on the client.
// A home's notes are those rows; a search asks the database
// (knob resource_picker.notes_search_limit caps the list); a body is read only
// for a note whose preview is expanded or that is picked (`fetchNoteById`).
//
// Local state on purpose: these are a popover's transient query results, not
// the notes the /notes surface edits (that store is the notes Redux slice).

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { knobInt } from "@/lib/knobs/featureKnobs";
import {
  fetchNoteById,
  fetchAllNotePickerRows,
  fetchRecentNotePickerRows,
  searchNotePickerRows,
  type NotePickerRow,
} from "../service/notesService";
import { CONTENT_SEARCH_DEBOUNCE_MS } from "./useNoteContentSearch";
import type { Note } from "../types";

export const NOTE_PICKER_RECENT_KNOB = {
  feature: "resource_picker",
  key: "notes_recent_count",
} as const;
export const NOTE_PICKER_SEARCH_KNOB = {
  feature: "resource_picker",
  key: "notes_search_limit",
} as const;

export interface NoteHomeCount {
  scopeId: string;
  note_count: number;
}

interface Loadable<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * A knob's effective value for this person (organization + user overrides);
 * with no active organization, the platform value from the register. Never a
 * constant: an unseeded knob raises in `knobInt` and surfaces as a read error.
 */
function usePickerKnob(ref: { feature: string; key: string }): {
  value: number | null;
  error: Error | null;
} {
  const organizationId = useAppSelector(selectOrganizationId);
  const userId = useAppSelector(selectUserId);
  const effective = useEffectiveKnob(organizationId, userId, ref);
  const [platform, setPlatform] = useState<{ value: number | null; error: Error | null }>({
    value: null,
    error: null,
  });
  const needsPlatform = !organizationId;
  useEffect(() => {
    if (!needsPlatform) return;
    let cancelled = false;
    knobInt(ref.feature, ref.key).then(
      (value) => !cancelled && setPlatform({ value, error: null }),
      (err: unknown) => !cancelled && setPlatform({ value: null, error: asError(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [needsPlatform, ref.feature, ref.key]);
  if (!needsPlatform) {
    const n = Number(effective);
    return { value: effective === undefined || !Number.isFinite(n) ? null : Math.round(n), error: null };
  }
  return platform;
}

export interface NotePicker {
  recent: Loadable<NotePickerRow[]>;
  /** Homes holding notes, with counts. */
  homes: Loadable<NoteHomeCount[]>;
  /** Rows of one home. */
  homeRows: (scopeId: string) => Loadable<NotePickerRow[]>;
  /** Server search for `query` (empty = idle). `capped` = more matches exist. */
  search: Loadable<NotePickerRow[]> & { query: string; capped: boolean };
  /** Full body of a previewed note (loaded on demand). */
  body: (id: string) => Loadable<string | null> | undefined;
  loadBody: (id: string) => void;
  /** The whole note, body included — read at pick time. */
  loadFullNote: (id: string) => Promise<Note>;
  retry: () => void;
}

const IDLE_SEARCH = { data: [] as NotePickerRow[], loading: false, error: null, query: "", capped: false };

export function useNotePicker(searchQuery: string): NotePicker {
  const recentKnob = usePickerKnob(NOTE_PICKER_RECENT_KNOB);
  const searchKnob = usePickerKnob(NOTE_PICKER_SEARCH_KNOB);
  const [attempt, setAttempt] = useState(0);

  const [recent, setRecent] = useState<Loadable<NotePickerRow[]>>({ data: [], loading: true, error: null });
  const [all, setAll] = useState<Loadable<NotePickerRow[]>>({ data: [], loading: true, error: null });
  const [bodies, setBodies] = useState<Record<string, Loadable<string | null>>>({});
  const [search, setSearch] = useState<NotePicker["search"]>(IDLE_SEARCH);

  const recentLimit = recentKnob.value;
  const knobError = recentKnob.error;

  useEffect(() => {
    if (knobError) {
      setRecent({ data: [], loading: false, error: knobError });
      return;
    }
    if (recentLimit === null) return;
    let cancelled = false;
    setRecent((prev) => ({ ...prev, loading: true, error: null }));
    fetchRecentNotePickerRows(recentLimit).then(
      (data) => !cancelled && setRecent({ data, loading: false, error: null }),
      (err: unknown) => !cancelled && setRecent({ data: [], loading: false, error: asError(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [recentLimit, knobError, attempt]);

  useEffect(() => {
    let cancelled = false;
    setAll((prev) => ({ ...prev, loading: true, error: null }));
    fetchAllNotePickerRows().then(
      (data) => !cancelled && setAll({ data, loading: false, error: null }),
      (err: unknown) => !cancelled && setAll({ data: [], loading: false, error: asError(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const trimmed = searchQuery.trim();
  const searchLimit = searchKnob.value;
  const searchKnobError = searchKnob.error;
  useEffect(() => {
    if (!trimmed) {
      setSearch(IDLE_SEARCH);
      return;
    }
    if (searchKnobError) {
      setSearch({ ...IDLE_SEARCH, query: trimmed, error: searchKnobError });
      return;
    }
    if (searchLimit === null) return;
    let cancelled = false;
    setSearch((prev) => ({ ...prev, query: trimmed, loading: true, error: null }));
    const timer = setTimeout(() => {
      // One more than the cap tells us whether more matches exist.
      searchNotePickerRows(trimmed, searchLimit + 1).then(
        (rows) =>
          !cancelled &&
          setSearch({
            data: rows.slice(0, searchLimit),
            loading: false,
            error: null,
            query: trimmed,
            capped: rows.length > searchLimit,
          }),
        (err: unknown) =>
          !cancelled && setSearch({ ...IDLE_SEARCH, query: trimmed, error: asError(err) }),
      );
    }, CONTENT_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, searchLimit, searchKnobError, attempt]);

  const loadBody = (id: string) => {
    const existing = bodies[id];
    if (existing && (existing.loading || !existing.error)) return;
    setBodies((prev) => ({ ...prev, [id]: { data: null, loading: true, error: null } }));
    fetchNoteById(id, { failureMode: "throw" }).then(
      (note) => setBodies((prev) => ({ ...prev, [id]: { data: note?.content ?? null, loading: false, error: null } })),
      (err: unknown) =>
        setBodies((prev) => ({ ...prev, [id]: { data: null, loading: false, error: asError(err) } })),
    );
  };

  const loadFullNote = async (id: string): Promise<Note> => {
    const note = await fetchNoteById(id, { failureMode: "throw" });
    if (!note) throw new Error("This note is no longer available — it may have been deleted.");
    return note;
  };

  const homeCounts = new Map<string, number>();
  for (const row of all.data) homeCounts.set(row.home_scope_id, (homeCounts.get(row.home_scope_id) ?? 0) + 1);
  const homes: Loadable<NoteHomeCount[]> = {
    data: [...homeCounts].map(([scopeId, note_count]) => ({ scopeId, note_count })),
    loading: all.loading,
    error: all.error,
  };

  const retry = () => {
    setAttempt((n) => n + 1);
  };

  return {
    recent,
    homes,
    homeRows: (scopeId) => ({
      data: all.data.filter((row) => row.home_scope_id === scopeId),
      loading: all.loading,
      error: all.error,
    }),
    search,
    body: (id) => bodies[id],
    loadBody,
    loadFullNote,
    retry,
  };
}
