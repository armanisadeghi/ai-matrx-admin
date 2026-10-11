// features/notes/service/notesService.ts

import { tryWriteOne } from "@/utils/supabase/writeOne";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { requireUserId } from "@/utils/auth/getUserId";
import { operationFailed } from "@/utils/errors";
import { recordUnavailable } from "@/lib/records/recordUnavailable";
import { requireOrganizationContext } from "@/lib/api/organization-context";
import { guardedUpdate } from "@ai-matrx/data/db";
import {
  noteEditedFieldsEqual,
  type NoteEditBase,
} from "../utils/saveVerification";
import type {
  Note,
  NoteRow,
  NoteUpdate,
  CreateNoteInput,
  UpdateNoteInput,
  NoteListItem,
  NoteContextLinks,
  UpdateNoteOptions,
  DeleteNoteOptions,
} from "../types";
import { generateLabelFromContent } from "../hooks/useAutoLabel";
import { findEmptyNewNote } from "../utils/noteUtils";
import {
  hydrateNoteContextLinks,
  syncNoteContextLinks,
} from "./noteContextAssociations";
import {
  NoteContextPartialSaveError,
  NotePostAcknowledgementError,
  type NoteSaveReceipt,
  NoteUpdateConflictError,
} from "./noteSaveErrors";
import {
  defaultListFilter,
  resolveListScope,
  type ListScopeWord,
} from "@/lib/list-scope";
import { readAllRows } from "@ai-matrx/data/db";
import { escapeIlike } from "../hooks/useNoteContentSearch";

/**
 * Fetch the notes this screen should open on (excluding deleted).
 *
 * WHERE THIS LANDS IS A REGISTRY WORD, NOT A LITERAL (DD-137c, VISIBILITY-BY-CLASS §3.3). The
 * `note` token is registered `default_list_scope = 'organization'`, so the list opens on the
 * organization's notes — the viewer's own included — and a caller that genuinely means "only mine"
 * passes `"mine"` and gets exactly that. The old comment here said the filter existed so that "my
 * notes" would not include shared ones; that is still available, it is just no longer assumed for
 * every caller. RLS remains the ceiling either way: this only decides where the screen starts.
 */
export async function fetchNotes(scope?: ListScopeWord): Promise<Note[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", {
    userId,
    requested: scope,
  });
  let query = supabase
    .schema("workbench")
    .from("notes")
    .select("*")
    .is("deleted_at", null);
  query = listScope.apply(query);
  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    throw error;
  }

  return hydrateNoteContextLinks(data ?? []);
}

/**
 * Fetch lightweight note list items (no content) for pickers and sidebars.
 */
export async function fetchNoteListItems(
  scope?: ListScopeWord,
): Promise<NoteListItem[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", {
    userId,
    requested: scope,
  });
  let query = supabase
    .schema("workbench")
    .from("notes")
    .select(
      "id, created_by, label, home_scope_id, tags, updated_at, position, organization_id, shown_to, published_to_web, version",
    )
    .is("deleted_at", null);
  query = listScope.apply(query);
  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching note list items:", error);
    throw error;
  }

  return hydrateNoteContextLinks(data ?? []) as Promise<NoteListItem[]>;
}

// ── Picker reads (resource picker "+" → Notes, Source input "A note") ───────
// The picker used to download EVERY note with its full body just to open
// (Arman, 2026-09-29: "it took a long time … fetch the last 10 most active plus
// some counts"). It now opens on these three bounded reads; the body of a note
// is read only when that note is picked or its preview is expanded
// (`fetchNoteById`).

/** One picker row: never the body — the database-maintained 240-char preview. */
export type NotePickerRow = Pick<
  NoteRow,
  "id" | "label" | "home_scope_id" | "tags" | "updated_at" | "content_preview"
>;

const NOTE_PICKER_COLUMNS =
  "id, label, home_scope_id, tags, updated_at, content_preview";

/** The `limit` most recently changed notes the list opens on. */
export async function fetchRecentNotePickerRows(
  limit: number,
  scope?: ListScopeWord,
): Promise<NotePickerRow[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", { userId, requested: scope });
  let query = supabase
    .schema("workbench")
    .from("notes")
    .select(NOTE_PICKER_COLUMNS)
    .is("deleted_at", null);
  query = listScope.apply(query);
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw operationFailed("load your recent notes", error);
  return data ?? [];
}

/**
 * Every note the list would show, as picker rows (no bodies). The picker
 * groups them by home on the client — a list the person treats as complete.
 */
export async function fetchAllNotePickerRows(
  scope?: ListScopeWord,
): Promise<NotePickerRow[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", { userId, requested: scope });
  return readAllRows<NotePickerRow>(
    ({ from, to }) => {
      let q = supabase
        .schema("workbench")
        .from("notes")
        .select(NOTE_PICKER_COLUMNS, { count: "exact" })
        .is("deleted_at", null);
      q = listScope.apply(q);
      return q
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
    },
    { label: "workbench.notes (picker)" },
  );
}

/**
 * Search every note the list would show — title and body — in
 * the database, newest first. The body half is the same ILIKE the notes
 * sidebar's body search runs (`useNoteContentSearch`, same escaping).
 */
export async function searchNotePickerRows(
  query: string,
  limit: number,
  scope?: ListScopeWord,
): Promise<NotePickerRow[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", { userId, requested: scope });
  // PostgREST `or` values are comma/paren-delimited, so the pattern is
  // double-quoted — and inside quotes PostgREST reads `\\` and `\"` as escapes,
  // so the ILIKE escapes from `escapeIlike` are escaped once more.
  const pattern = `"%${escapeIlike(query.trim()).replace(/[\\"]/g, (ch) => `\\${ch}`)}%"`;
  let q = supabase
    .schema("workbench")
    .from("notes")
    .select(NOTE_PICKER_COLUMNS)
    .is("deleted_at", null)
    .or(
      `label.ilike.${pattern},content.ilike.${pattern}`,
    );
  q = listScope.apply(q);
  const { data, error } = await q
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw operationFailed("search your notes", error);
  return data ?? [];
}

/**
 * Fetch a batch of notes by id (any note the caller can read — attached
 * observation notes may belong to teammates, so no created_by filter).
 * Deleted notes are excluded; missing/inaccessible ids are simply absent.
 */
export async function fetchNotesByIds(ids: string[]): Promise<Note[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .schema("workbench")
    .from("notes")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes by ids:", error);
    throw error;
  }

  return hydrateNoteContextLinks(data ?? []);
}

/**
 * Fetch a single note by ID
 */
export async function fetchNoteById(
  id: string,
  options: { failureMode?: "empty" | "throw" } = {},
): Promise<Note | null> {
  const { data, error } = await supabase
    .schema("workbench")
    .from("notes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Error fetching note:", error);
    if (options.failureMode === "throw")
      throw operationFailed("load this note", error);
    return null;
  }

  if (!data) return null;
  const [note] = await hydrateNoteContextLinks([data]);
  return note;
}

/**
 * Create a new note
 * Automatically generates label from content if label is missing or is "New Note"
 * IMPORTANT: Checks for existing empty notes and reuses them to prevent duplicates
 */
export function emptyNoteReuseUpdates(
  existingNote: Note,
  input: CreateNoteInput,
): UpdateNoteInput {
  const updates: UpdateNoteInput = {};
  const requestedLabel = input.label?.trim();
  if (
    requestedLabel &&
    requestedLabel.toLowerCase() !== "new note" &&
    existingNote.label !== requestedLabel
  ) {
    updates.label = requestedLabel;
  }
  if (input.metadata !== undefined) updates.metadata = input.metadata;
  if (input.custom_fields !== undefined)
    updates.custom_fields = input.custom_fields;
  if (input.position !== undefined) updates.position = input.position;
  if (input.shown_to !== undefined) updates.shown_to = input.shown_to;
  if (input.published_to_web !== undefined) updates.published_to_web = input.published_to_web;
  if (input.project_id !== undefined) updates.project_id = input.project_id;
  if (input.task_id !== undefined) updates.task_id = input.task_id;
  return updates;
}

/**
 * Materialize a client-generated note under its already captured identity.
 * This deliberately never calls `createNote`: an autogenerated record's
 * stable client id is its only reconciliation key, and empty-note reuse would
 * silently redirect its buffered edits into another record.
 */
export async function materializeNote(input: Note): Promise<Note> {
  const organizationId = requireOrganizationContext(input.organization_id);
  const userId = requireUserId();
  if (input.created_by !== userId) {
    throw new Error(
      "The signed-in user changed before this note could be saved.",
    );
  }
  await assertInitiatingNotesUser(userId);
  const { data, error } = await supabase
    .schema("workbench")
    .from("notes")
    .insert({
      id: input.id,
      created_by: userId,
      label: input.label,
      content: input.content,
      organization_id: organizationId,
      // The draft's chosen home; absent = the organization's General (the database fills it).
      ...(input.home_scope_id ? { home_scope_id: input.home_scope_id } : {}),
      tags: input.tags,
      // NOT NULL with a '{}' default: an absent value is the default, never null.
      metadata: input.metadata ?? {},
      position: input.position,
      shown_to: input.shown_to,
      published_to_web: input.published_to_web,
    })
    .select()
    .single();
  if (error) {
    throw new Error(
      `This new note was not confirmed as saved. Keep the draft open and retry from the existing note: ${error.message}`,
    );
  }
  const [note] = await hydrateNoteContextLinks([data]);
  return note;
}

export async function assertInitiatingNotesUser(
  expectedUserId: string,
): Promise<void> {
  if (requireUserId() !== expectedUserId) {
    throw new Error(
      "Your sign-in changed before this draft could be initialized.",
    );
  }
  // Verified claims, not the cookie's deserialized `session.user`.
  const { data, error } = await getClaimsUser(supabase);
  if (error || data.user?.id !== expectedUserId) {
    throw new Error(
      "Your sign-in changed before this draft could be initialized.",
    );
  }
}

/**
 * The note a generation run already created, found by the run key stamped into
 * its `metadata.run_key` (education kit runs: a resumed run adopts its note
 * instead of filing a second one beside the kit).
 */
export async function findNoteByRunKey(
  organizationId: string,
  runKey: string,
): Promise<Note | null> {
  const { data, error } = await supabase
    .schema("workbench")
    .from("notes")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("metadata->>run_key", runKey)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw operationFailed("look up this run's note", error);
  const id = (data ?? [])[0]?.id;
  return id ? fetchNoteById(id, { failureMode: "throw" }) : null;
}

/**
 * Create a note for one generation run: the run's earlier note when it already
 * exists, otherwise a new note stamped with the run key.
 */
export async function createNoteForRun(
  input: CreateNoteInput,
  runKey: string | null | undefined,
): Promise<Note> {
  if (!runKey) return createNote(input);
  const organizationId = requireOrganizationContext(input.organization_id);
  const earlier = await findNoteByRunKey(organizationId, runKey);
  if (earlier) return earlier;
  const metadata =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : {};
  return createNote({
    ...input,
    metadata: { ...metadata, run_key: runKey } as CreateNoteInput["metadata"],
  });
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  // This must be the first tenant operation: even an empty-note reuse is a
  // cross-organization read unless the captured destination is admitted first.
  const organizationId = requireOrganizationContext(input.organization_id);
  const userId = requireUserId();

  const content = input.content || "";
  // CRITICAL: If creating an empty note (no content or whitespace only), check for existing empty notes
  const isCreatingEmptyNote = !content || content.trim() === "";

  if (isCreatingEmptyNote) {
    // An explicit home reuses only an empty note in THAT home; no home named reuses the
    // person's empty note in the organization (the new one would land in its General).
    let reuseQuery = supabase
      .schema("workbench")
      .from("notes")
      .select("*")
      .eq("created_by", userId)
      .eq("organization_id", organizationId);
    if (input.home_scope_id) reuseQuery = reuseQuery.eq("home_scope_id", input.home_scope_id);
    const { data: existingRows, error: reuseError } = await reuseQuery
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (reuseError) throw reuseError;
    const existingNotes = await hydrateNoteContextLinks(existingRows ?? []);
    const existingEmptyNote = findEmptyNewNote(existingNotes);

    if (existingEmptyNote) {
      console.log(
        "Reusing existing empty note instead of creating duplicate:",
        existingEmptyNote.id,
      );

      // Reuse must preserve the caller's explicit name. Returning the generic
      // empty row unchanged made the war-room "+ New" dialog ignore its input.
      const reuseUpdates = emptyNoteReuseUpdates(existingEmptyNote, input);
      if (Object.keys(reuseUpdates).length > 0) {
        return updateNote(existingEmptyNote.id, reuseUpdates);
      }

      // Nothing to change, just return it
      return existingEmptyNote;
    }
  }

  // Auto-generate label from content if needed
  let finalLabel = input.label || "New Note";

  // Check if we should auto-generate the label
  const shouldAutoGenerate =
    !finalLabel ||
    finalLabel.trim() === "" ||
    finalLabel.toLowerCase() === "new note";

  if (shouldAutoGenerate && content.trim()) {
    const generatedLabel = generateLabelFromContent(content);
    if (generatedLabel) {
      finalLabel = generatedLabel;
    }
  }

  // No existing empty note found, create a new one
  const { data, error } = await supabase
    .schema("workbench")
    .from("notes")
    .insert({
      // Canonical RLS std_insert requires created_by = auth.uid(). The
      // _stamp_actor trigger fills this too, but set it explicitly so the
      // INSERT passes with_check even if the trigger order ever changes.
      created_by: userId,
      label: finalLabel,
      content: content,
      tags: input.tags || [],
      metadata: input.metadata || {},
      custom_fields: input.custom_fields || {},
      position: input.position || 0,
      // Listed for its maker alone by default ("Shown to" is a list filter, never a lock —
      // access ladder); never published unless chosen.
      shown_to: input.shown_to ?? "only_me",
      published_to_web: input.published_to_web ?? false,
      organization_id: organizationId,
      // The note's home. Absent = the organization's General (the database fills it).
      ...(input.home_scope_id ? { home_scope_id: input.home_scope_id } : {}),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", error);
    throw error;
  }

  console.log(
    "Created new note:",
    data.id,
    "Label:",
    finalLabel,
    "Content length:",
    content.length,
  );
  const contextSettlement = await syncNoteContextLinks({
    noteId: data.id,
    organizationId,
    projectId: input.project_id,
    taskId: input.task_id,
  });
  const note: Note = {
    ...data,
    project_id: contextSettlement.succeededFields.includes("project_id")
      ? (input.project_id ?? null)
      : null,
    task_id: contextSettlement.succeededFields.includes("task_id")
      ? (input.task_id ?? null)
      : null,
  };
  const receipt: NoteSaveReceipt = {
    note,
    databaseWrite: "saved",
    ...contextSettlement,
  };
  if (receipt.failedFields.length > 0) {
    throw new NoteContextPartialSaveError(receipt);
  }
  if (receipt.postSaveRecoveryError) {
    console.error(
      "Created note context links need a cache recovery",
      receipt.postSaveRecoveryError,
    );
  }
  return receipt.note;
}

/**
 * Update an existing note.
 *
 * An expected version uses the platform CAS primitive. The organization is
 * always derived from the authorized persisted row, never from active UI
 * context. Legacy callers without an edit-base version retain LWW behavior.
 */
export async function persistNoteUpdate(
  id: string,
  updates: UpdateNoteInput,
  options?: UpdateNoteOptions,
): Promise<NoteSaveReceipt> {
  const untypedUpdates = updates as Record<string, unknown>;
  if (untypedUpdates.organization_id !== undefined) {
    throw new Error(
      "Moving a note to another organization is not available yet. Keep this note in its current organization.",
    );
  }
  if (
    options?.expectedVersion !== undefined &&
    (!Number.isSafeInteger(options.expectedVersion) ||
      options.expectedVersion < 0)
  ) {
    throw new Error("The note revision must be a nonnegative safe integer.");
  }
  if (options?.expectedActorId !== undefined) {
    await assertInitiatingNotesUser(options.expectedActorId);
  }
  if (options?.expectedOrganizationId !== undefined) {
    requireOrganizationContext(options.expectedOrganizationId);
  }

  // Existing-resource mutations bind to the resource's organization, never the
  // mutable organization picker. A caller that already holds the acknowledged
  // organization AND the acknowledged context links (the Redux save path)
  // skips the two reads that only existed to learn them — measured 2026-09-21:
  // a home change from the picker was SIX sequential round trips and 2.6 s,
  // and every autosave paid these two. A caller without them reads, as before.
  let organizationId: string;
  let priorStoredNote: NoteContextLinks;
  if (
    options?.expectedOrganizationId !== undefined &&
    options.priorContextLinks !== undefined
  ) {
    organizationId = requireOrganizationContext(options.expectedOrganizationId);
    priorStoredNote = options.priorContextLinks;
  } else {
    const { data: existing, error: existingError } = await supabase
      .schema("workbench")
      .from("notes")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (existingError || !existing)
      throw (
        existingError ??
        operationFailed("save this note — it may already be gone")
      );
    organizationId = requireOrganizationContext(existing.organization_id);
    if (
      options?.expectedOrganizationId !== undefined &&
      options.expectedOrganizationId !== organizationId
    ) {
      throw new Error(
        "This note belongs to a different organization than the editor snapshot. Reload the note before saving.",
      );
    }
    // Retain the canonical association projection before any write. It lets a
    // partial context settlement return the acknowledged row without pretending
    // the note write rolled back when a later association read cannot hydrate.
    [priorStoredNote] = await hydrateNoteContextLinks([existing]);
  }
  const normalizedUpdates: NoteUpdate & Partial<NoteContextLinks> = {
    ...updates,
  };

  const {
    project_id: projectId,
    task_id: taskId,
    ...databaseUpdates
  } = normalizedUpdates;

  let data: NoteRow | null = null;
  const databaseWrite =
    Object.keys(databaseUpdates).length > 0 ? "saved" : "unchanged";
  if (Object.keys(databaseUpdates).length > 0) {
    if (options?.expectedVersion !== undefined) {
      const result = await guardedUpdate<NoteRow>({
        expectedVersion: options.expectedVersion,
        applyUpdate: ({ expectedVersion, nextVersion }) =>
          supabase
            .schema("workbench")
            .from("notes")
            .update({ ...databaseUpdates, version: nextVersion })
            .eq("id", id)
            .eq("organization_id", organizationId)
            .eq("version", expectedVersion)
            .is("deleted_at", null)
            .select("*")
            .maybeSingle(),
        fetchCurrent: () =>
          supabase
            .schema("workbench")
            .from("notes")
            .select("*")
            .eq("id", id)
            .eq("organization_id", organizationId)
            .is("deleted_at", null)
            .maybeSingle(),
        // THE PHANTOM CONFLICT: `version` moves on every row update. A CAS
        // miss on a row whose EDITED fields still equal this client's base is
        // a number we never learned, not a conflict — retry once on it.
        ...(options?.acknowledgedBase !== undefined
          ? {
              rebase: {
                isPhantom: (currentRow: NoteRow) =>
                  noteEditedFieldsEqual(
                    currentRow,
                    options.acknowledgedBase as NoteEditBase,
                  ),
              },
            }
          : {}),
      });
      if (result.status === "conflict") {
        throw new NoteUpdateConflictError({
          expectedVersion: options.expectedVersion,
          actualStoredNote: result.currentRow,
        });
      }
      if (result.status === "not_found") {
        throw operationFailed(
          "save this note — it may already be gone or you no longer have access",
        );
      }
      data = result.row;
    } else {
      // write-lands-exempt: zero rows leaves `data` null, and the `if (!data)` below refuses in words
      const { data: updated, error } = await supabase
        .schema("workbench")
        .from("notes")
        .update(databaseUpdates)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("Error updating note:", error);
        throw error;
      }
      data = updated;
    }
  } else {
    const result = await supabase
      .schema("workbench")
      .from("notes")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();
    data = result.data;
    if (result.error) {
      console.error("Error reading note after context update:", result.error);
      throw result.error;
    }
  }

  if (!data) {
    throw operationFailed(
      "save this note — nothing was changed. It may need editor access you don't have, or the note may already be gone",
    );
  }

  const contextSettlement = await syncNoteContextLinks({
    noteId: id,
    organizationId,
    projectId,
    taskId,
  });
  const receipt: NoteSaveReceipt = {
    note: {
      ...data,
      project_id: contextSettlement.succeededFields.includes("project_id")
        ? (projectId ?? null)
        : priorStoredNote.project_id,
      task_id: contextSettlement.succeededFields.includes("task_id")
        ? (taskId ?? null)
        : priorStoredNote.task_id,
    },
    databaseWrite,
    ...contextSettlement,
  };
  if (options?.expectedActorId !== undefined) {
    try {
      await assertInitiatingNotesUser(options.expectedActorId);
    } catch (cause) {
      throw new NotePostAcknowledgementError({
        receipt,
        actorId: options.expectedActorId,
        kind: "actor-changed-after-ack",
        sourceId: options.expectedSourceId,
        snapshotId: options.expectedSnapshotId,
        cause:
          cause instanceof Error ? cause : new Error("The sign-in changed."),
      });
    }
  }
  if (receipt.postSaveRecoveryError && options?.expectedActorId !== undefined) {
    throw new NotePostAcknowledgementError({
      receipt,
      actorId: options.expectedActorId,
      kind: "post-save-recovery",
      sourceId: options.expectedSourceId,
      snapshotId: options.expectedSnapshotId,
      cause: receipt.postSaveRecoveryError,
    });
  }
  if (receipt.failedFields.length > 0) {
    throw new NoteContextPartialSaveError(receipt);
  }
  return receipt;
}

/** Temporary compatibility adapter while direct editors migrate to receipts. */
export async function updateNote(
  id: string,
  updates: UpdateNoteInput,
  options?: UpdateNoteOptions,
): Promise<Note> {
  return (await persistNoteUpdate(id, updates, options)).note;
}

/**
 * Soft delete a note
 */
export async function deleteNote(
  id: string,
  options?: DeleteNoteOptions,
): Promise<void> {
  if (options?.expectedActorId !== undefined)
    await assertInitiatingNotesUser(options.expectedActorId);
  if (
    options?.expectedVersion !== undefined &&
    (!Number.isSafeInteger(options.expectedVersion) ||
      options.expectedVersion < 0)
  ) {
    throw new Error("The note revision must be a nonnegative safe integer.");
  }
  const expectedOrganizationId = options?.expectedOrganizationId;
  if (expectedOrganizationId !== undefined)
    requireOrganizationContext(expectedOrganizationId);

  const deleteAt = new Date().toISOString();
  if (options?.expectedVersion !== undefined) {
    const result = await guardedUpdate<Pick<NoteRow, "id" | "version">>({
      expectedVersion: options.expectedVersion,
      applyUpdate: ({ expectedVersion, nextVersion }) => {
        let query = supabase
          .schema("workbench")
          .from("notes")
          .update({ deleted_at: deleteAt, version: nextVersion })
          .eq("id", id)
          .eq("version", expectedVersion)
          .is("deleted_at", null);
        if (expectedOrganizationId !== undefined)
          query = query.eq("organization_id", expectedOrganizationId);
        return query.select("id, version").maybeSingle();
      },
      fetchCurrent: () => {
        let query = supabase
          .schema("workbench")
          .from("notes")
          .select("id, version")
          .eq("id", id)
          .is("deleted_at", null);
        if (expectedOrganizationId !== undefined)
          query = query.eq("organization_id", expectedOrganizationId);
        return query.maybeSingle();
      },
    });
    if (result.status === "conflict")
      throw new Error(
        "This note changed after the agent prepared this action. Reload the list and try again.",
      );
    if (result.status === "not_found")
      throw operationFailed(
        "delete this note — it may already be gone or you no longer have access",
      );
    if (options?.expectedActorId !== undefined)
      await assertInitiatingNotesUser(options.expectedActorId);
    return;
  }

  let query = supabase
    .schema("workbench")
    .from("notes")
    .update({ deleted_at: deleteAt })
    .eq("id", id)
    .select("id");
  if (expectedOrganizationId !== undefined)
    query = query.eq("organization_id", expectedOrganizationId);
  const { data, error } = await query;
  if (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
  if (!data || data.length === 0) {
    throw operationFailed(
      "delete this note — nothing was changed. It may need owner access you don't have, or the note may already be gone",
    );
  }
}

/**
 * Copy/duplicate a note
 * Smart labeling: If original was "New Note", auto-generate from content
 */
export async function copyNote(id: string): Promise<Note> {
  // First fetch the original note
  const { data: original, error: fetchError } = await supabase
    .schema("workbench")
    .from("notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching note to copy:", fetchError);
    throw operationFailed("copy this note", fetchError);
  }
  if (!original) {
    throw recordUnavailable({
      entity: "note",
      reason: "unknown",
      recordId: id,
      token: "note",
      relation: "workbench.notes",
    });
  }

  // Smart label handling
  let copyLabel: string;
  if (original.label.toLowerCase() === "new note") {
    // If original was "New Note", let auto-labeling handle it
    copyLabel = "New Note";
  } else {
    // Otherwise, append (Copy) to the original label
    copyLabel = `${original.label} (Copy)`;
  }

  // Create a copy with modified label
  const copy: CreateNoteInput = {
    label: copyLabel,
    content: original.content,
    tags: original.tags || [],
    metadata: original.metadata || {},
    organization_id: requireOrganizationContext(original.organization_id),
    // The copy keeps the original's home.
    home_scope_id: original.home_scope_id,
  };

  return await createNote(copy);
}

/**
 * Every tag on the notes this list opens on — same scope as the list itself.
 */
export async function fetchTags(scope?: ListScopeWord): Promise<string[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", {
    userId,
    requested: scope,
  });
  let tagQuery = supabase
    .schema("workbench")
    .from("notes")
    .select("tags")
    .is("deleted_at", null);
  tagQuery = listScope.apply(tagQuery);
  const { data, error } = await tagQuery;

  if (error) {
    console.error("Error fetching tags:", error);
    return [];
  }

  const allTags = data.flatMap((n) => n.tags || []);
  const uniqueTags = Array.from(new Set(allTags));
  return uniqueTags.sort();
}
