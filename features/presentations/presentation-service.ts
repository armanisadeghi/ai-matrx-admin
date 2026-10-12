/**
 * Presentation service — typed doors for `workbench.presentation` (token `presentation`).
 *
 * A canonical entity (platform.create_entity_table, certified): `deck` holds the
 * `presentation_deck` kind JSON exactly as chat/agents emit it (`__kind` kept), version
 * history is the platform's (`history.row_versions` via `lib/versioning/versionHistory`),
 * sharing is the registry row `presentation`, trash is `deleted_at`.
 *
 * Rows carry `user_id` (= `created_by`) so the shared file actions (which read an owner
 * from `user_id`) work unchanged with workbooks, documents and presentations.
 */
import { readAllRows } from "@ai-matrx/data/db";
import { getClaimsUser } from "@ai-matrx/auth";
import { supabase } from "@/utils/supabase/client";
import { tryWriteOne, writeOneRow } from "@/utils/supabase/writeOne";
import { requireOrganizationContext } from "@/lib/api/organization-context";
import type { ServiceResult } from "@/features/data-tables/types";
import type { Database } from "@/types/database.types";
import { blankDeck, deckForStorage, normalizeDeck, type Deck } from "./deck-model";

type DbRow = Database["workbench"]["Tables"]["presentation"]["Row"];
export type PresentationRow = Omit<DbRow, "deck"> & { deck: Deck; user_id: string };
export type PresentationSource = "created" | "template" | "chat" | "copy" | "imported";

export const PRESENTATION_NAME_MAX_LENGTH = 255;

const table = () => supabase.schema("workbench").from("presentation");

function toRow(row: DbRow): PresentationRow {
  return { ...row, deck: normalizeDeck(row.deck), user_id: row.created_by ?? "" };
}

function fail<T>(error: unknown): ServiceResult<T> {
  return { success: false, error: error instanceof Error ? error.message : String(error) };
}

export type CreatePresentationArgs = {
  name?: string;
  organizationId: string;
  deck?: unknown;
  source?: PresentationSource;
  projectId?: string | null;
  description?: string | null;
};

export async function createPresentation(args: CreatePresentationArgs): Promise<ServiceResult<PresentationRow>> {
  let organizationId: string;
  try {
    organizationId = requireOrganizationContext(undefined, args.organizationId);
  } catch (error) {
    return fail(error);
  }
  const { data: userData, error: userErr } = await getClaimsUser(supabase);
  if (userErr || !userData?.user) return { success: false, error: userErr?.message ?? "not authenticated" };
  const deck = args.deck === undefined ? blankDeck() : normalizeDeck(args.deck);
  const name = (args.name ?? "").trim() || deck.title?.trim() || deck.slides[0]?.title?.trim() || "Untitled presentation";
  const { data, error } = await table()
    .insert({
      name: name.slice(0, PRESENTATION_NAME_MAX_LENGTH),
      description: args.description ?? null,
      deck: deckForStorage(deck) as never,
      source: args.source ?? "created",
      project_id: args.projectId ?? null,
      organization_id: organizationId,
      created_by: userData.user.id,
      visibility: "internal",
    })
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: toRow(data as DbRow) };
}

export async function listAccessiblePresentations(): Promise<ServiceResult<PresentationRow[]>> {
  try {
    const rows = await readAllRows<DbRow>(
      ({ from, to }) =>
        table()
          .select("*", { count: "exact" })
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<DbRow[]>(),
      { label: "workbench.presentation accessible presentations" },
    );
    return { success: true, data: rows.map(toRow) };
  } catch (error) {
    return fail(error);
  }
}

export async function listTrashedPresentations(): Promise<ServiceResult<PresentationRow[]>> {
  const { data, error } = await table().select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: ((data ?? []) as DbRow[]).map(toRow) };
}

export async function getPresentation(id: string): Promise<ServiceResult<PresentationRow>> {
  const { data, error } = await table().select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: "This presentation is in the trash or you no longer have access to it. Restore it from Trash, or ask its owner to share it again.",
    };
  }
  return { success: true, data: toRow(data as DbRow) };
}

/** Save the deck (the editor's autosave). Each save is one platform version. */
export async function savePresentationDeck(id: string, deck: Deck): Promise<ServiceResult<PresentationRow>> {
  const { data, error } = await writeOneRow(
    table().update({ deck: deckForStorage(deck) as never }).eq("id", id).select("*"),
    { action: "update", noun: "presentation" },
  );
  if (error) return { success: false, error: error.message };
  return { success: true, data: toRow(data as DbRow) };
}

export async function renamePresentation(id: string, name: string): Promise<ServiceResult<PresentationRow>> {
  const clean = name.trim().slice(0, PRESENTATION_NAME_MAX_LENGTH);
  if (!clean) return { success: false, error: "A presentation needs a name." };
  const { data, error } = await writeOneRow(table().update({ name: clean }).eq("id", id).select("*"), {
    action: "update",
    noun: "presentation",
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: toRow(data as DbRow) };
}

export async function movePresentation(id: string, projectId: string | null): Promise<ServiceResult<PresentationRow>> {
  const { data, error } = await writeOneRow(table().update({ project_id: projectId }).eq("id", id).select("*"), {
    action: "update",
    noun: "presentation",
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: toRow(data as DbRow) };
}

export async function deletePresentation(id: string): Promise<ServiceResult<true>> {
  const { error } = await tryWriteOne(table().update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id"), {
    action: "delete",
    noun: "presentation",
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: true };
}

export async function restorePresentation(id: string): Promise<ServiceResult<true>> {
  const { error } = await tryWriteOne(table().update({ deleted_at: null }).eq("id", id).select("id"), {
    action: "restore",
    noun: "presentation",
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: true };
}

/** An independent copy (same organization and project), opened by the caller. */
export async function copyPresentation(id: string, name?: string): Promise<ServiceResult<PresentationRow>> {
  const original = await getPresentation(id);
  if (!original.success) return original;
  const row = original.data;
  return createPresentation({
    name: name ?? `Copy of ${row.name}`,
    organizationId: row.organization_id,
    projectId: row.project_id,
    description: row.description,
    deck: row.deck,
    source: "copy",
  });
}
