// features/notes/types.ts
import type { Database } from "@/types/database.types";

// ── Database row alias ──────────────────────────────────────────────────────
// Single source of truth. All code referencing the DB shape must derive from here.
export type NoteRow = Database["workbench"]["Tables"]["notes"]["Row"];
export type NoteInsert = Database["workbench"]["Tables"]["notes"]["Insert"];
export type NoteUpdate = Database["workbench"]["Tables"]["notes"]["Update"];

// note_versions retired -> history.row_versions (use the get_note_versions RPCs).
// note_shares retired -> canonical permissions table. Neither has a public type row anymore.

// ── Canonical association projection ───────────────────────────────────────
// Project/task membership is an optional platform.associations edge, never a
// physical FK on workbench.notes. These two fields are a read projection that
// keeps the note UI ergonomic while the generated NoteRow remains DB truth.
export interface NoteContextLinks {
  project_id: string | null;
  task_id: string | null;
}

// `content_preview` is a database-maintained projection of `content` (a stored
// generated column, audit N-24): the server writes it, a client never does, and
// a full row read carries it while a locally minted record does not — so it is
// optional on the app-side shape.
// The retiring row column (access ladder T-13) is not part of the client model: a note's row
// controls are `shown_to` (which lists show it — never a lock) and `published_to_web`. Who stamped
// the publish, and when, is server-set, so a locally minted record may lack them.
/** The stored row as the client models it — any full DB row satisfies it. */
export type NoteStoredRow = Omit<
  NoteRow,
  | "content_preview"
  | "visibility"
  | "published_to_web_at"
  | "published_to_web_by"
  | "home_scope_id"
> & {
  /** The note's one home (a scope). Null only on a client draft not yet stored — the
   *  database fills the organization's General on insert. Changed only by `moveNoteToHome`. */
  home_scope_id?: string | null;
  content_preview?: string | null;
  published_to_web_at?: string | null;
  published_to_web_by?: string | null;
};

export type Note = NoteStoredRow & NoteContextLinks;

// ── Narrowed shapes for JSON columns ────────────────────────────────────────
// `metadata` is a Json column — the generated type is `unknown`. Consumers use
// this helper to read it as a structured object.
export interface NoteMetadata {
  lastEditorMode?: string;
  [key: string]: unknown;
}

export function getNoteMetadata(
  note: Pick<Note, "metadata"> | null | undefined,
): NoteMetadata {
  const raw = note?.metadata;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as NoteMetadata;
  }
  return {};
}

// ── Sidebar list projection (subset returned by fetchNotesList) ─────────────
// Only fields selected in the list query — keep in sync with thunks.ts.
export type NoteListItem = Pick<
  NoteRow,
  | "id"
  | "created_by"
  | "label"
  | "tags"
  | "updated_at"
  | "position"
  | "organization_id"
  | "home_scope_id"
  | "shown_to"
  | "published_to_web"
  | "version"
> &
  NoteContextLinks;

// ── Group-by modes for the sidebar ──────────────────────────────────────────
export type NoteGroupBy =
  "home" | "organization" | "project" | "task" | "scope";

// ── View modes for the editor ────────────────────────────────────────────────
export type NoteViewMode =
  "edit" | "split" | "rich" | "md" | "preview" | "diff";

export const NOTE_VIEW_MODES: readonly NoteViewMode[] = [
  "edit",
  "split",
  "rich",
  "md",
  "preview",
  "diff",
];

// ── Input types ─────────────────────────────────────────────────────────────
// Derived from the DB Insert/Update shapes so new columns flow automatically
// and removed columns break callers.
export type CreateNoteInput = Pick<
  NoteInsert,
  | "label"
  | "content"
  | "tags"
  | "metadata"
  | "custom_fields"
  | "position"
  | "shown_to"
  | "published_to_web"
> & {
  /** Captured at the initiating edge. The note writer never resolves it. */
  organization_id: string;
  /** The note's home scope (must be in `organization_id`). Absent = that organization's General. */
  home_scope_id?: string | null;
} & Partial<NoteContextLinks>;

export type NoteContentUpdate = Pick<
  NoteUpdate,
  | "label"
  | "content"
  | "tags"
  | "metadata"
  | "custom_fields"
  | "position"
  | "shown_to"
  | "published_to_web"
> &
  Partial<NoteContextLinks>;

/** A persisted note never changes organization through an update; its home moves through `moveNoteToHome`. */
export type UpdateNoteInput = NoteContentUpdate & { organization_id?: never };

/**
 * Captured identity at the editor boundary. A version turns the write into a
 * compare-and-swap; the organization guards against saving a stale record
 * snapshot into a different tenant.
 */
export interface UpdateNoteOptions {
  expectedVersion?: number;
  /**
   * The user-edited fields exactly as this client last acknowledged them from
   * the server (its edit base). When the compare-and-swap on `expectedVersion`
   * misses but the server's edited fields still equal this base, the version
   * moved for a column nobody edits and the write is retried once against the
   * current version instead of being reported as a conflict.
   * See `utils/saveVerification.ts`.
   */
  acknowledgedBase?: import("./utils/saveVerification").NoteEditBase;
  expectedOrganizationId?: string;
  /**
   * The note's project/task links as this client last acknowledged them. With
   * `expectedOrganizationId` this lets the save skip its pre-write full-row
   * read AND its association read: two sequential round trips (~150 ms each
   * from a browser, 2026-09-21 measurement) on EVERY autosave, whose only
   * purpose was to learn two things the caller already holds. The write itself
   * stays organization-qualified and version-guarded, so a stale caller gets an
   * honest not-found or conflict, never a misfiled row.
   */
  priorContextLinks?: NoteContextLinks;
  /** Optional explicit actor binding for a prepared direct-editor save. */
  expectedActorId?: string;
  /** Callback lifetime identity retained if acknowledgement needs recovery. */
  expectedSourceId?: string;
  expectedSnapshotId?: string;
}

/** Identity captured by an agent or editor before moving a note to Trash. */
export interface DeleteNoteOptions {
  expectedVersion?: number;
  expectedOrganizationId?: string;
  expectedActorId?: string;
}

export interface NoteFilters {
  search?: string;
  tags?: string[];
}

export type NoteSortField = "label" | "created_at" | "updated_at";
export type NoteSortOrder = "asc" | "desc";

export interface NoteSortConfig {
  field: NoteSortField;
  order: NoteSortOrder;
}
