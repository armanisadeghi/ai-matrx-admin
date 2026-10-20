// features/spaces/templates/template-copy.ts — a Space template copy's lifecycle follows its ROOT page (Notion parity,
// ADVERSARIAL-6 F1/F2/F3).
//
// THE LINK: "Use template" chooses the copy's install id before anything is written and stamps it on the root page at
// creation (`content.document.metadata.from_template = {install_id, catalogue_id}`, the same shape the install stamps on
// an Applet it copies), and the run records that page on the install (`template_install_note`, kind page). So both sides
// carry the other's RECORDED id: never a title or a time window. A page duplicated from a root carries no stamp
// (content.space_duplicate does not copy metadata), so only the page the run made can remove the copy.
//
// THE DOORS are the records family's own (`runTemplateDoor`): `template_uninstall` archives the tables, fields, views and
// assistant AND moves the recorded pages to Trash; `template_restore` brings all of it back. Nothing here duplicates them.

import { mapPgError, supabaseDataSource } from "@ai-matrx/records/core";
import { listTemplateInstances, runTemplateDoor, TEMPLATE_BUSY_MESSAGE, type TemplateDoorAnswer, type TemplateInstanceRow } from "@ai-matrx/records/templates";

import { createClient } from "@/utils/supabase/client";

import type { SpaceId } from "../contract";

/** The metadata key on a template copy's root page (registered in platform.metadata_reserved_keys for `document`). */
export const FROM_TEMPLATE_KEY = "from_template";

export interface TemplateCopyStamp {
  installId: string;
  catalogueId: string;
}

/** The metadata a copy's root page is created with. */
export function templateCopyMetadata(stamp: TemplateCopyStamp): Record<string, unknown> {
  return { [FROM_TEMPLATE_KEY]: { install_id: stamp.installId, catalogue_id: stamp.catalogueId } };
}

/** The stamp a page's metadata carries, or null (an ordinary page). */
export function readTemplateCopyStamp(metadata: unknown): TemplateCopyStamp | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>)[FROM_TEMPLATE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const { install_id, catalogue_id } = raw as { install_id?: unknown; catalogue_id?: unknown };
  return typeof install_id === "string" && install_id && typeof catalogue_id === "string" && catalogue_id ? { installId: install_id, catalogueId: catalogue_id } : null;
}

/** A template copy, seen from its root page. */
export interface TemplateCopy {
  installId: string;
  catalogueId: string;
  organizationId: string;
  rootId: SpaceId;
  title: string;
  /** The install's state: "installed" (live), "uninstalling" (a removal stopped part way), "uninstalled" (removed). */
  state: TemplateInstanceRow["state"];
  /** How many tables the copy made. */
  tables: number;
}

/** A copy is live when its install is installed (or still installing); anything else was removed, whole or in part. */
export const copyIsLive = (state: TemplateInstanceRow["state"]) => state === "installed" || state === "installing";

/**
 * The template copy `pageId` is the root of, or null for an ordinary page (no stamp, or a stamp whose install this
 * organization no longer lists). Two small reads: the page's stamp, then the copy's install row.
 */
export async function templateCopyOfPage(pageId: SpaceId): Promise<TemplateCopy | null> {
  const { data, error } = await createClient().schema("content").from("document").select("id, organization_id, title, metadata").eq("id", pageId).maybeSingle();
  if (error) throw new Error(`We couldn't read this page: ${error.message}`);
  const stamp = readTemplateCopyStamp(data?.metadata);
  if (!data || !stamp) return null;
  const { ok, instances, error: listError } = await listTemplateInstances(supabaseDataSource(createClient()), data.organization_id, stamp.catalogueId);
  if (!ok) throw new Error(`We couldn't read this page's template copy: ${listError?.message ?? "no answer"}`);
  const row = instances.find((i) => i.install_id === stamp.installId);
  if (!row) return null;
  return {
    installId: row.install_id,
    catalogueId: stamp.catalogueId,
    organizationId: data.organization_id,
    rootId: data.id,
    title: data.title || row.title || "this template",
    state: row.state,
    tables: row.tables.length,
  };
}

/** A copy's root page as its install recorded it: live, in Trash, or gone. */
export interface CopyRoot {
  id: SpaceId;
  trashed: boolean;
}

/**
 * The root page of each install (by the id the run stamped), live or in Trash. An install with no stamped page is
 * absent from the answer (made before the stamp existed, or its page was deleted for good).
 */
export async function copyRoots(organizationId: string, installIds: readonly string[]): Promise<Map<string, CopyRoot>> {
  const out = new Map<string, CopyRoot>();
  if (!installIds.length) return out;
  const { data, error } = await createClient()
    .schema("content")
    .from("document")
    .select("id, deleted_at, metadata")
    .eq("organization_id", organizationId)
    .eq("format", "spaces")
    .in(`metadata->${FROM_TEMPLATE_KEY}->>install_id`, [...installIds])
    .limit(installIds.length * 4);
  if (error) throw new Error(`We couldn't find your copy's pages: ${error.message}`);
  for (const row of (data ?? []) as Array<{ id: string; deleted_at: string | null; metadata: unknown }>) {
    const stamp = readTemplateCopyStamp(row.metadata);
    if (!stamp) continue;
    const seen = out.get(stamp.installId);
    // A live page wins over a trashed one (never expected: one root per install).
    if (!seen || (seen.trashed && !row.deleted_at)) out.set(stamp.installId, { id: row.id, trashed: !!row.deleted_at });
  }
  return out;
}

/** Codes the store answers when it was busy, not when the template is wrong. */
const BUSY_CODES = new Set(["57014", "55P03", "40P01", "40001"]);
/** Codes and statuses that mean the database API itself was away. */
const AWAY_CODES = new Set(["PGRST000", "PGRST001", "PGRST002", "PGRST003", "502", "503", "504", ""]);

/**
 * ADVERSARIAL-6 F4: ONE plain sentence for a template door that stopped, from the records family's own words: busy →
 * TEMPLATE_BUSY_MESSAGE, the API away → the shared mapper's sentence (mapPgError), otherwise the store's own first
 * sentence. The step, its label and the raw text go to the console; "Try again" is the button's, never the sentence's.
 */
export function templateDoorSentence(refusal: Record<string, unknown> | null | undefined, error?: { code?: string | null; message?: string | null } | null): string {
  const code = String(refusal?.["code"] ?? error?.code ?? "");
  const raw = String(refusal?.["message"] ?? error?.message ?? "");
  if (refusal || error) console.warn("[spaces] a template door stopped", { step: refusal?.["step"], label: refusal?.["label"], code, message: raw });
  // A busy refusal the door already put in plain words (records busyRefusal) is said as it is.
  if (refusal?.["busy"] === true && raw) return firstSentence(raw);
  if (BUSY_CODES.has(code)) return TEMPLATE_BUSY_MESSAGE;
  if (AWAY_CODES.has(code) && (code !== "" || !raw || /fetch|network|schema cache/i.test(raw))) return mapPgError({ code, message: raw }, "the template").message;
  // A transport error (not the door's own refusal) reads through the shared mapper, the same words every records screen uses.
  if (!refusal && raw) return firstSentence(mapPgError({ code: code || null, message: raw }, "the template").message);
  return raw ? firstSentence(raw) : "The template stopped before it finished.";
}

function firstSentence(text: string): string {
  const one = text.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
  const clean = one.replace(/[.\s]+$/, "");
  return clean ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}.` : "The template stopped before it finished.";
}

export type CopyDoorResult = { ok: true; answer: TemplateDoorAnswer | null } | { ok: false; message: string };

/**
 * Removes (`template_uninstall`) or restores (`template_restore`) one copy through the records door, saying how far it
 * got after every call (`done` of `total` things moved). 10–40 s for a big copy; every way it ends comes back here.
 */
export async function runCopyDoor(
  door: "template_uninstall" | "template_restore",
  copy: Pick<TemplateCopy, "organizationId" | "installId">,
  onProgress?: (done: number, total: number) => void,
): Promise<CopyDoorResult> {
  let most = 0;
  try {
    const run = await runTemplateDoor(supabaseDataSource(createClient()), door, copy.organizationId, copy.installId, {
      maxCalls: 400,
      onCall: (answer) => {
        const archived = Array.isArray(answer.archived) ? answer.archived.length : 0;
        if (door === "template_uninstall") {
          const total = (answer.made ?? []).filter((m) => m.id).length;
          onProgress?.(Math.min(archived, total), total);
        } else {
          most = Math.max(most, archived + (answer.done ? 0 : 1));
          onProgress?.(most - archived, most);
        }
      },
    });
    if (run.ok && run.answer) return { ok: true, answer: run.answer };
    return { ok: false, message: templateDoorSentence(run.answer?.refusal, run.error) };
  } catch (err) {
    return { ok: false, message: templateDoorSentence(null, { code: "", message: err instanceof Error ? err.message : String(err) }) };
  }
}

/** What Move to Trash / Restore need, handed in so the whole lifecycle runs under test. */
export interface CopyLifecyclePorts {
  /** templateCopyOfPage */
  readCopy: (pageId: SpaceId) => Promise<TemplateCopy | null>;
  /** The page store's own Trash and Restore. */
  archive: (pageId: SpaceId) => Promise<void>;
  restore: (pageId: SpaceId) => Promise<void>;
  /** The one-line consequence, asked before a copy is removed; true = go. */
  confirm: (copy: TemplateCopy, removeCopy: boolean) => Promise<boolean>;
  /** Runs a records door over the copy with its progress and result said (SpacesProvider runCopy). */
  runDoor: (door: "template_uninstall" | "template_restore", copy: TemplateCopy) => Promise<boolean>;
}

/**
 * MOVE TO TRASH (ADVERSARIAL-6 F1, Notion parity): an ordinary page goes to Trash. The ROOT of a live template copy
 * removes the copy after the one-line confirm: `template_uninstall` archives its tables, fields, views and assistant and
 * moves its recorded pages to Trash, so no `installed` copy is ever left behind a trashed root. A removal that stopped
 * part way is finished. `removeCopy` is the menu's "Remove template copy" (same path, refused on an ordinary page).
 */
export async function trashPageOrCopy(pageId: SpaceId, ports: CopyLifecyclePorts, options?: { removeCopy?: boolean }): Promise<"trashed" | "removed" | "kept"> {
  const copy = await ports.readCopy(pageId);
  if (copy?.state === "uninstalling") {
    await ports.runDoor("template_uninstall", copy);
    return "removed";
  }
  if (!copy || !copyIsLive(copy.state)) {
    if (options?.removeCopy) throw new Error("This page is not a template copy.");
    await ports.archive(pageId);
    return "trashed";
  }
  if (!(await ports.confirm(copy, !!options?.removeCopy))) return "kept";
  await ports.runDoor("template_uninstall", copy);
  return "removed";
}

/** RESTORE: a removed copy's root brings the whole copy back (`template_restore`), then the page leaves Trash as asked. */
export async function restorePageOrCopy(pageId: SpaceId, ports: CopyLifecyclePorts): Promise<void> {
  const copy = await ports.readCopy(pageId);
  if (copy && !copyIsLive(copy.state)) await ports.runDoor("template_restore", copy);
  // Always: a root trashed by hand before the stamp existed, or a door that stopped, still leaves Trash as asked.
  await ports.restore(pageId);
}

/** The confirm's words: what else goes, in one line, and that it comes back. */
export function removeCopyQuestion(copy: Pick<TemplateCopy, "title" | "tables">, removeCopy: boolean): { title: string; description: string; confirmLabel: string } {
  const tables = copy.tables === 1 ? "its 1 table" : `its ${copy.tables} tables`;
  return {
    title: removeCopy ? `Remove ${copy.title}?` : `Move ${copy.title} to Trash?`,
    description: `Also removes ${tables}. You can restore it from Trash.`,
    confirmLabel: removeCopy ? "Remove" : "Move to Trash",
  };
}
