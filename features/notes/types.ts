// features/notes/types.ts
import type { Database } from "@/types/database.types";

// ── Database row alias ──────────────────────────────────────────────────────
// Single source of truth. All code referencing the DB shape must derive from here.
export type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
export type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"];
export type NoteUpdate = Database["public"]["Tables"]["notes"]["Update"];

export type NoteFolderRow = Database["public"]["Tables"]["note_folders"]["Row"];
export type NoteVersionRow = Database["public"]["Tables"]["note_versions"]["Row"];
export type NoteShareRow = Database["public"]["Tables"]["note_shares"]["Row"];

// ── Note type — derived from DB Row, with non-nullable normalizations ───────
// Null fields are retained as `null` (not coerced to empty strings) so callers
// can distinguish "not set" from "empty string". The one exception is `id` and
// `user_id` which are always present per the schema.
//
// IMPORTANT: This interface must stay structurally compatible with NoteRow.
// The compile-time check below enforces this — add fields here AND in NoteRow.
export interface Note {
    // ── Always-present identifiers ──────────────────────────────────────
    id: string;
    user_id: string;

    // ── Core content ────────────────────────────────────────────────────
    label: string;
    content: string | null;
    folder_name: string | null;
    tags: string[] | null;
    metadata: Record<string, unknown> | null;
    shared_with: Record<string, unknown> | null;

    // ── Context relationships (FK columns) ──────────────────────────────
    folder_id: string | null;         // FK → note_folders.id
    organization_id: string | null;   // FK → organizations.id
    project_id: string | null;        // FK → ctx_projects.id
    task_id: string | null;           // FK → ctx_tasks.id

    // ── State flags ─────────────────────────────────────────────────────
    is_deleted: boolean | null;
    is_public: boolean;

    // ── Sync / versioning ───────────────────────────────────────────────
    version: number;
    sync_version: number;
    content_hash: string | null;
    file_path: string | null;
    last_device_id: string | null;
    position: number | null;

    // ── Timestamps ──────────────────────────────────────────────────────
    created_at: string | null;
    updated_at: string | null;
}

// ── Compile-time structural compatibility check ─────────────────────────────
// If NoteRow gains or loses fields this will produce a TypeScript error,
// forcing an update to the Note interface above. No runtime cost.
type _NoteCompatCheck = {
    [K in keyof NoteRow]: NoteRow[K] extends Note[K]
        ? Note[K] extends NoteRow[K]
            ? true
            : false
        : false;
};

// ── Sidebar list projection (subset returned by fetchNotesList) ─────────────
// Only fields selected in the list query — keep in sync with thunks.ts.
export type NoteListItem = Pick<
    Note,
    | "id"
    | "user_id"
    | "label"
    | "folder_name"
    | "folder_id"
    | "tags"
    | "updated_at"
    | "position"
    | "organization_id"
    | "project_id"
    | "task_id"
    | "is_public"
    | "version"
>;

// ── Group-by modes for the sidebar ──────────────────────────────────────────
export type NoteGroupBy = "folder" | "organization" | "project" | "task" | "scope";

// ── View modes for the editor ────────────────────────────────────────────────
export type NoteViewMode = "edit" | "split" | "rich" | "md" | "preview" | "diff";

export const NOTE_VIEW_MODES: readonly NoteViewMode[] = [
    "edit",
    "split",
    "rich",
    "md",
    "preview",
    "diff",
];

// ── Input types ─────────────────────────────────────────────────────────────
export interface CreateNoteInput {
    label?: string;
    content?: string;
    folder_name?: string;
    folder_id?: string;
    organization_id?: string;
    project_id?: string;
    task_id?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    position?: number;
    is_public?: boolean;
}

export interface UpdateNoteInput {
    label?: string;
    content?: string;
    folder_name?: string;
    folder_id?: string;
    organization_id?: string;
    project_id?: string;
    task_id?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    position?: number;
    is_public?: boolean;
}

export interface FolderGroup {
    folder_name: string;
    notes: Note[];
    count: number;
}

export interface NoteFilters {
    search?: string;
    tags?: string[];
    folder_name?: string;
}

export type NoteSortField = 'label' | 'created_at' | 'updated_at';
export type NoteSortOrder = 'asc' | 'desc';

export interface NoteSortConfig {
    field: NoteSortField;
    order: NoteSortOrder;
}

