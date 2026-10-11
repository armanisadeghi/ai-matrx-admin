/**
 * features/files/virtual-sources/adapters/notes.ts
 *
 * Notes virtual source adapter. Surfaces the existing notes-v2 system in the
 * `/files` tree without disturbing how notes-v2 itself runs (Phase 0 audit
 * confirmed this adapter is purely additive).
 *
 * Mapping:
 *   - `notes` table rows → file leaves
 *   - `notes.home_scope_id` (the note's one home, a scope) → directories, one
 *     per home that holds a note (see notesHomeFolders.ts)
 *   - `notes.label` → display name
 *   - `notes.content` → file content (markdown)
 *   - `notes.updated_at` → optimistic concurrency
 *
 * Double-clicking a note in `/files` hands off to `/notes/<id>`, where the
 * rich notes-v2 editor takes over. The cloud-files Monaco editor is reserved
 * for sources without a dedicated route.
 */

"use client";

import { StickyNote } from "lucide-react";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { readAllRows } from "@ai-matrx/data/db";
import { homeReceiptFrom, homeRefusalMessage } from "@/features/notes/homes/homeModel";
import { resolveHomeScopeId } from "@/features/notes/homes/moveNoteToHome";
import {
  homeVidFromScopeId,
  nameHomeDirectories,
  scopeIdFromHomeVid,
} from "./notesHomeFolders";
import { registerVirtualSource } from "@/features/files/virtual-sources/registry";
import { NotesInlinePreview } from "./NotesInlinePreview";
import type { Database } from "@/types/database.types";
import { recordUnavailable } from "@/lib/records/recordUnavailable";
import { writeOne } from "@/utils/supabase/writeOne";
import type {
  ListArgs,
  RenameArgs,
  WriteArgs,
  MoveArgs,
  CreateArgs,
  VirtualContent,
  VirtualNode,
  VirtualSourceAdapter,
} from "@/features/files/virtual-sources/types";
import { defaultListFilter } from "@/lib/list-scope";

const TAB_ID_PREFIX = "notes:";

const notesAdapter: VirtualSourceAdapter = {
  sourceId: "notes",
  label: "Notes",
  icon: StickyNote,
  capabilities: {
    list: true,
    read: true,
    write: true,
    rename: true,
    delete: true,
    move: true,
    folders: true,
    binary: false,
    versions: true,
    multiField: false,
  },
  dnd: { acceptsOwn: true },
  pathPrefix: "/Notes",

  makeTabId(id, fieldId) {
    return fieldId
      ? `${TAB_ID_PREFIX}${id}:${fieldId}`
      : `${TAB_ID_PREFIX}${id}`;
  },
  parseTabId(tabId) {
    if (!tabId.startsWith(TAB_ID_PREFIX)) return null;
    const rest = tabId.slice(TAB_ID_PREFIX.length);
    const colon = rest.indexOf(":");
    if (colon < 0) return { id: rest };
    return { id: rest.slice(0, colon), fieldId: rest.slice(colon + 1) };
  },

  async list(supabase, userId, args: ListArgs): Promise<VirtualNode[]> {
    if (!userId) return [];
    if (args.parentId === null) {
      // Adapter root — one directory per home that holds a note.
      const listScope = await defaultListFilter("note", { userId });
      const noteRows = await readAllRows<{ home_scope_id: string }>(
        ({ from, to }) => {
          let q = supabase
            .schema("workbench").from("notes")
            .select("home_scope_id", { count: "exact" })
            .is("deleted_at", null);
          q = listScope.apply(q);
          return q.order("home_scope_id").range(from, to);
        },
        { label: "workbench.notes (files tree homes)" },
      );
      const homeIds = Array.from(new Set(noteRows.map((row) => row.home_scope_id)));
      if (homeIds.length === 0) return [];
      const { data: scopes, error: scopeError } = await supabase
        .schema("custom").from("context_scopes")
        .select("id, name, organization_id")
        .in("id", homeIds);
      if (scopeError) return [];
      const orgIds = Array.from(new Set((scopes ?? []).map((s) => s.organization_id).filter((id): id is string => !!id)));
      const orgNames = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase.schema("iam").from("organizations").select("id, name").in("id", orgIds);
        for (const org of orgs ?? []) if (org.id) orgNames.set(org.id, org.name ?? "");
      }
      const homes = (scopes ?? []).map((scope) => ({
        scopeId: scope.id as string,
        name: (scope.name as string | null) ?? "Home",
        organizationName: orgNames.get(scope.organization_id as string) ?? "",
      }));
      const names = nameHomeDirectories(homes);
      return homes
        .map((home): VirtualNode => ({
          id: homeVidFromScopeId(home.scopeId),
          kind: "folder",
          name: names.get(home.scopeId) ?? home.name,
          parentId: null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // Inside a home — list the notes whose home it is.
    const homeScopeId = scopeIdFromHomeVid(args.parentId);
    if (!homeScopeId) return [];
    const listListScope = await defaultListFilter("note", { userId });
    let query = supabase
      .schema("workbench").from("notes")
      .select("id, label, updated_at, version");
    query = listListScope.apply(query);
    query = args.includeDeleted
      ? query.not("deleted_at", "is", null)
      : query.is("deleted_at", null);
    query = query.eq("home_scope_id", homeScopeId);
    const { data, error } = await query.order("updated_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(
      (row): VirtualNode => ({
        id: row.id,
        kind: "file",
        name: row.label ?? "Untitled note",
        parentId: args.parentId,
        updatedAt: row.updated_at ?? undefined,
        extension: "md",
        language: "markdown",
        mimeType: "text/markdown",
      }),
    );
  },

  async read(supabase, userId, id): Promise<VirtualContent> {
    const { data, error } = await supabase
      .schema("workbench").from("notes")
      .select("id, label, content, updated_at")
      .is("deleted_at", null)
      .eq("id", id)
      .eq("created_by", userId)
      .maybeSingle();
    if (error) {
      throw new Error("We couldn't open this note. Please try again.");
    }
    if (!data) {
      throw recordUnavailable({
        entity: "note",
        reason: "unknown",
        recordId: id,
        relation: "workbench.notes",
      });
    }
    const name = data.label ?? "Untitled note";
    return {
      id: data.id,
      name,
      path: `/Notes/${name}.md`,
      language: "markdown",
      mimeType: "text/markdown",
      content: data.content ?? "",
      updatedAt: data.updated_at ?? undefined,
    };
  },

  async write(supabase, userId, args: WriteArgs) {
    const update: { content: string; updated_at: string } = {
      content: args.content,
      updated_at: new Date().toISOString(),
    };
    let query = supabase
      .schema("workbench").from("notes")
      .update(update)
      .eq("id", args.id)
      .eq("created_by", userId);
    if (args.expectedUpdatedAt) {
      query = query.eq("updated_at", args.expectedUpdatedAt);
    }
    const { data, error } = await query
      .select("updated_at")
      .maybeSingle();
    if (error || !data) {
      throw new Error(
        "We couldn't save this note. It may have been edited somewhere else — reload it and reapply your change.",
      );
    }
    return { updatedAt: data.updated_at ?? update.updated_at };
  },

  async rename(supabase, userId, args: RenameArgs) {
    const update = {
      label: args.newName,
      updated_at: new Date().toISOString(),
    };
    let query = supabase
      .schema("workbench").from("notes")
      .update(update)
      .eq("id", args.id)
      .eq("created_by", userId);
    if (args.expectedUpdatedAt) {
      query = query.eq("updated_at", args.expectedUpdatedAt);
    }
    const { data, error } = await query
      .select("updated_at")
      .maybeSingle();
    if (error || !data) {
      throw new Error("We couldn't rename this note. Please try again.");
    }
    return { updatedAt: data.updated_at ?? update.updated_at };
  },

  async move(supabase, userId, args: MoveArgs) {
    // Move = the one move path: platform.set_home on the note's current version.
    // The directory is `home:<scope id>`; a note always has a home, so there is
    // no "unfiled" directory to drop it on.
    const scopeId = args.newParentId === null ? null : scopeIdFromHomeVid(args.newParentId);
    if (!scopeId) throw new Error("Drop a note on a home to move it there.");
    const resolved = await resolveHomeScopeId(scopeId);
    if (!resolved.ok) throw new Error(resolved.message);
    const { data: current, error: readError } = await supabase
      .schema("workbench").from("notes")
      .select("version")
      .eq("id", args.id)
      .eq("created_by", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !current) throw new Error("We couldn't move this note. Please try again.");
    const { data, error } = await supabase.schema("platform").rpc("set_home", {
      p_entity_type: "note",
      p_entity_id: args.id,
      p_scope_id: resolved.scopeId,
      p_expected_version: current.version,
    });
    if (error) throw new Error(homeRefusalMessage(error));
    homeReceiptFrom(data);
    const { data: moved } = await supabase
      .schema("workbench").from("notes")
      .select("updated_at")
      .eq("id", args.id)
      .maybeSingle();
    return { updatedAt: moved?.updated_at ?? new Date().toISOString() };
  },

  async delete(supabase, userId, id) {
    // Delete means archive (Arman, 2026-09-27): soft delete only; Trash restores it.
    await writeOne(
      supabase
        .schema("workbench").from("notes")
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("created_by", userId)
        .select("id"),
      { action: "delete", noun: "note" },
    );
  },

  async create(supabase, userId, args: CreateArgs) {
    if (args.kind === "folder") {
      // A directory here is a home — a scope. Homes are made in Notes ("New home…"), where the
      // organization and kind are chosen; this tree cannot make one.
      throw new Error("Make a new home in Notes, then it appears here.");
    }
    const homeScopeId = args.parentId === null ? null : scopeIdFromHomeVid(args.parentId);
    let homeOrganizationId: string | undefined;
    if (homeScopeId) {
      const { data: scope } = await supabase
        .schema("custom").from("context_scopes")
        .select("organization_id")
        .eq("id", homeScopeId)
        .maybeSingle();
      homeOrganizationId = (scope?.organization_id as string | null | undefined) ?? undefined;
    }
    const { data, error } = await supabase
      .schema("workbench").from("notes")
      .insert({
        // Canonical RLS std_insert requires created_by = auth.uid().
        created_by: userId,
        label: args.name,
        content: args.content ?? "",
        // A note made inside a home is that home's (and its organization's); at the root the
        // database files it in the active organization's General.
        ...(homeScopeId ? { home_scope_id: homeScopeId } : {}),
        // org-filter: write-target writes into the organization the person is working in; no list reads it
        organization_id: await ensureOrgId(homeOrganizationId),
        // Notes are private by default. The `notes.visibility` enum column
        // (2026 canonicalization) defaults to `'internal'` at the DB; set it
        // explicitly so a new note isn't silently org-visible.
        visibility: "personal",
      })
      .select("id, label, updated_at")
      .maybeSingle();
    if (error || !data) {
      throw new Error("We couldn't create that note. Please try again.");
    }
    return {
      id: data.id,
      kind: "file" as const,
      name: data.label ?? args.name,
      parentId: args.parentId,
      updatedAt: data.updated_at ?? undefined,
      extension: "md",
      language: "markdown",
      mimeType: "text/markdown",
    };
  },

  inlinePreview: NotesInlinePreview,

  openInRoute(node) {
    // Home directories don't have a dedicated route; only file leaves do.
    if (node.kind === "folder") return null;
    return `/notes/${node.id}`;
  },

  async listVersions(supabase, id) {
    // Backed by `history.row_versions` via RPC; the legacy `note_versions`
    // table is deprecated. The RPC returns rows ordered by version DESC and
    // exposes neither `created_by` nor a `change_summary` — use `label` as the
    // human-facing summary.
    const { data } = await supabase.rpc("get_note_versions", {
      p_note_id: id,
    });
    type NoteVersionRow =
      Database["public"]["Functions"]["get_note_versions"]["Returns"][number];
    return (data ?? []).map((row: NoteVersionRow) => ({
      id: row.id,
      versionNumber: row.version_number,
      createdAt: row.created_at,
      createdBy: null,
      changeSummary: row.label ?? null,
    }));
  },
};

registerVirtualSource(notesAdapter);
