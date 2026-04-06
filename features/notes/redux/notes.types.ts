// features/notes/redux/notes.types.ts
// Types for the notes Redux slice — follows the agent-definition pattern.

import type { Note } from "../types";

// ── Undoable fields ─────────────────────────────────────────────────────────

export type NoteUndoableField = "content" | "label" | "folder_name" | "tags";

export const NOTE_UNDOABLE_FIELDS: readonly NoteUndoableField[] = [
  "content",
  "label",
  "folder_name",
  "tags",
];

// ── Undo entry ──────────────────────────────────────────────────────────────

/**
 * A single entry in the per-note undo/redo stack.
 * Stores the field name and the value it held *before* the change.
 * `timestamp` enables coalescing rapid edits into one logical entry.
 * `byteEstimate` enables smart compression to keep memory bounded.
 */
export interface NoteUndoEntry {
  field: NoteUndoableField;
  value: Note[NoteUndoableField];
  timestamp: number;
  byteEstimate: number;
}

export const NOTE_UNDO_MAX_ENTRIES = 50;
export const NOTE_UNDO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB soft cap per note
export const NOTE_UNDO_COALESCE_MS = 600; // Rapid edits within 600ms coalesce

// ── Fetch status ────────────────────────────────────────────────────────────

/** Two-stage fetch: "list" = basics for sidebar, "full" = content + metadata */
export type NoteFetchStatus = "list" | "full";

const FETCH_STATUS_RANK: Record<NoteFetchStatus, number> = {
  list: 1,
  full: 2,
};

export function shouldUpgradeNoteFetchStatus(
  current: NoteFetchStatus | null,
  incoming: NoteFetchStatus,
): boolean {
  if (!current) return true;
  return FETCH_STATUS_RANK[incoming] > FETCH_STATUS_RANK[current];
}

// ── Field snapshot (clean baselines for dirty tracking) ─────────────────────

export type NoteFieldSnapshot = Partial<
  Record<NoteUndoableField, Note[NoteUndoableField]>
>;

// ── Note record (extends Note with runtime tracking) ────────────────────────

export interface NoteRecord extends Note {
  _fetchStatus: NoteFetchStatus | null;
  _dirty: boolean;
  _dirtyFields: Set<NoteUndoableField>;
  _fieldHistory: NoteFieldSnapshot;
  _undoPast: NoteUndoEntry[];
  _undoFuture: NoteUndoEntry[];
  _loading: boolean;
  _saving: boolean;
  _error: string | null;
}

// ── Slice state ─────────────────────────────────────────────────────────────

export interface NotesSliceState {
  /** All notes keyed by ID */
  notes: Record<string, NoteRecord>;

  /** ID of the note currently active in the editor */
  activeNoteId: string | null;

  /** IDs of open tabs (order matters for tab bar) */
  openTabs: string[];

  /** Global list fetch status */
  listStatus: "idle" | "loading" | "loaded" | "error";
  listError: string | null;

  /** Whether the realtime channel is connected */
  realtimeConnected: boolean;

  /** Note IDs currently being saved — used for echo suppression */
  _savingNoteIds: string[];
}

// ── Helper to create a blank NoteRecord ─────────────────────────────────────

export function createBlankNoteRecord(note: Note): NoteRecord {
  return {
    ...note,
    _fetchStatus: null,
    _dirty: false,
    _dirtyFields: new Set(),
    _fieldHistory: {},
    _undoPast: [],
    _undoFuture: [],
    _loading: false,
    _saving: false,
    _error: null,
  };
}

export function createBlankNoteRecordFromPartial(
  partial: Partial<Note> & { id: string },
  status: NoteFetchStatus,
): NoteRecord {
  return {
    id: partial.id,
    user_id: partial.user_id ?? "",
    label: partial.label ?? "New Note",
    content: partial.content ?? "",
    folder_name: partial.folder_name ?? "Draft",
    tags: partial.tags ?? [],
    metadata: partial.metadata ?? {},
    shared_with: partial.shared_with ?? {},
    is_deleted: partial.is_deleted ?? false,
    position: partial.position ?? 0,
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? new Date().toISOString(),
    _fetchStatus: status,
    _dirty: false,
    _dirtyFields: new Set(),
    _fieldHistory: {},
    _undoPast: [],
    _undoFuture: [],
    _loading: false,
    _saving: false,
    _error: null,
  };
}
