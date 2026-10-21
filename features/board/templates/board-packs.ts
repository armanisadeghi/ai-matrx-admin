/**
 * BOARD TEMPLATE PACKS — a Space template pack that carries a `board` (lib/spaces-blocks/template-pack.ts
 * `PackBoard`), listed in the Board gallery beside the built-ins. ONE catalog: the pack is a platform
 * `custom.template` row published by `pnpm spaces:templates:publish`, read through `custom.space_templates`
 * (cards whose face carries `board`).
 *
 * USE = (1) the pack's tables installed into the active organization through the one install door
 * (`installTemplateTables`, the same call the Spaces gallery makes: a second use answers `already` with the
 * same tables); (2) the top board made with every table tile pointed at the made table (`planPackBoards`),
 * its starter notes filed in that organization; (3) each child board made as a page of it
 * (`settings.parent_board_id`); (4) the top board opened by the caller.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { installTemplateTables, listSpaceTemplates, readSpaceTemplate, type SpaceTemplateFull } from "@/features/spaces/templates/use-pack";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { createClient } from "@/utils/supabase/client";
import type { ResolvedTable } from "@/lib/spaces-blocks/template-pack";
import { COVER_ENTITY } from "../items/cover-source";
import { allTables } from "@ai-matrx/records/templates";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import type { JsonObject } from "@/types/json";

import type { BoardDocument } from "../board/document";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { createBoardFromDocument, deleteBoard, LAYOUT_SETTING, PARENT_BOARD_SETTING, type LoadedBoard } from "../persistence/boardsService";
import { planPackBoards, sketchTables } from "./board-pack-plan";
import { materializeStarterNotes } from "./starter-notes";

export const PACK_PREFIX = "pack:";

export const isPackKey = (key: string) => key.startsWith(PACK_PREFIX);
const templateIdOf = (key: string) => key.slice(PACK_PREFIX.length);

export interface BoardPackEntry {
  /** `pack:<custom.template id>`. */
  key: string;
  title: string;
  summary: string;
  /** The top board drawn over stand-in tables, for the gallery sketch (nothing is installed). */
  doc: BoardDocument;
  /** The board starts EMPTY (`board.startsEmpty`): its start offers the AI build first, a style second. */
  startsEmpty: boolean;
}

/** One reference-only style ("Start from a style"): a published board pack never listed in a gallery. */
export interface BoardStyle {
  templateId: string;
  /** "Calm neutral" (the pack title after its family name). */
  name: string;
  forWho: string;
}

/** A pack the gallery cannot read or draw is skipped, never silently: the console and the Error Inspector name it. */
export function reportUnreadablePack(what: string, err: unknown): void {
  const reason = err instanceof Error && err.message ? err.message : String(err);
  console.error(`[board/packs] ${what} was skipped: ${reason}`, err);
  captureError({
    source: "runtime-exception",
    code: "board_pack_unreadable",
    message: `${what} was skipped in the board template gallery: ${reason}`,
    userMessage: "Run pnpm spaces:templates:check on the pack file and publish it again.",
    recoverable: true,
    raw: err,
  });
}

/** Every board pack the person can use, each with its sketch. One pack that cannot be read is skipped and reported; the rest still list. */
export async function listBoardPacks(): Promise<BoardPackEntry[]> {
  const cards = await listSpaceTemplates(null, "board");
  const read = await Promise.allSettled(
    cards.map(async (c): Promise<BoardPackEntry> => {
      const full = await readSpaceTemplate(c.id);
      const board = full.pack.board;
      const doc = board ? planPackBoards(board, sketchTables(allTables(full.spec).map((t) => t.token)))[0].doc : emptyDoc();
      return { key: `${PACK_PREFIX}${c.id}`, title: c.space.board?.title ?? c.space.title, summary: c.space.description, doc, startsEmpty: c.space.board?.startsEmpty === true };
    }),
  );
  return read.flatMap((r, i) => {
    if (r.status === "fulfilled") return [r.value];
    reportUnreadablePack(`The board template "${cards[i].space?.title ?? cards[i].catalogue_id}" (${cards[i].catalogue_id})`, r.reason);
    return [];
  });
}

/** The styles an empty board pack can start from: reference-only packs that make every table it makes (by token). */
export async function listBoardStyles(key: string): Promise<BoardStyle[]> {
  const base = await readSpaceTemplate(templateIdOf(key));
  const tokens = allTables(base.spec).map((t) => t.token);
  const cards = await listSpaceTemplates(null, "reference");
  const read = await Promise.allSettled(cards.map((c) => readSpaceTemplate(c.id)));
  return read.flatMap((r, i): BoardStyle[] => {
    if (r.status !== "fulfilled") {
      reportUnreadablePack(`The style "${cards[i].space?.title ?? cards[i].catalogue_id}" (${cards[i].catalogue_id})`, r.reason);
      return [];
    }
    const has = new Set(allTables(r.value.spec).map((t) => t.token));
    if (!tokens.every((t) => has.has(t))) return [];
    const title = r.value.space.title;
    return [{ templateId: r.value.id, name: title.split(" — ").pop()?.trim() || title, forWho: r.value.space.forWho ?? "" }];
  });
}

/**
 * "Start from a style": the chosen style's rows written into the new board's own (empty) tables through the
 * records door (`recordWriteMany`, inserts), one table per call. A table the style does not carry stays empty.
 */
async function fillFromStyle(style: SpaceTemplateFull, tables: Record<string, ResolvedTable>, organizationId: string): Promise<void> {
  const client = createRecordsClient({ dataSource: supabaseDataSource(createClient()), actor: { actor: "user" }, organizationId });
  for (const t of allTables(style.spec)) {
    const made = tables[t.token];
    const rows = (t.rows ?? []).map((r) => r.values);
    if (!made || !rows.length) continue;
    const wrote = await client.recordWriteMany({ table_id: made.tableId, rows: rows as never });
    if (!wrote.ok) throw new Error(`${t.name}: ${wrote.error.message}`);
  }
}

/** The style's cover (hero + prose) on the made board's cover tile, so the board reads as that style at once. */
function withStyleCover(doc: BoardDocument, style: SpaceTemplateFull): BoardDocument {
  const cover = style.pack.board?.chapters.flatMap((c) => c.tiles).find((t) => t.kind === "cover");
  if (!cover) return doc;
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.source.kind === "entity" && n.source.entity === COVER_ENTITY ? { ...n, source: { ...n.source, meta: { hero: cover.hero ?? "", markdown: cover.text ?? "" } } } : n,
    ),
  };
}

function emptyDoc(): BoardDocument {
  return { camera: { x: 0, y: 0, z: 1 }, nodes: [], groups: [], edges: [], shapes: [] };
}

const settingsFor = (layout: "page" | "canvas", parentId?: string): JsonObject => ({
  ...(layout === "page" ? { [LAYOUT_SETTING]: "page" } : {}),
  ...(parentId ? { [PARENT_BOARD_SETTING]: parentId } : {}),
});

/**
 * The boards an unfinished "Use template" run has made (top board first), kept while the run works — the
 * board twin of the Spaces `PackRunJournal` (TEMPLATE-INSTALL-3). A run cut off part-way (closed tab, a
 * failed page) leaves its ids here; the next run deletes them before it starts, so a retry never leaves a
 * half board beside the new one.
 */
export interface BoardPackRunJournal {
  read(): string[] | null;
  write(boardIds: string[] | null): void;
  /** The fresh table copy an unfinished run started, so Try again continues it and never makes a second. */
  readInstall?(): string | null;
  writeInstall?(installId: string | null): void;
}

/** A browser-tab journal for one pack in one organization. */
export function boardPackRunJournal(organizationId: string, templateId: string): BoardPackRunJournal {
  const key = `matrx:board:pack-run:${organizationId}:${templateId}`;
  const storage = () => (typeof window === "undefined" ? null : window.localStorage);
  return {
    read: () => {
      const raw = storage()?.getItem(key);
      if (!raw) return null;
      try {
        const ids = JSON.parse(raw) as unknown;
        return Array.isArray(ids) && ids.every((x) => typeof x === "string") ? (ids as string[]) : null;
      } catch {
        return null;
      }
    },
    write: (ids) => (ids && ids.length ? storage()?.setItem(key, JSON.stringify(ids)) : storage()?.removeItem(key)),
    readInstall: () => storage()?.getItem(`${key}:install`) ?? null,
    writeInstall: (id) => (id ? storage()?.setItem(`${key}:install`, id) : storage()?.removeItem(`${key}:install`)),
  };
}

const reasonOf = (err: unknown) => (err instanceof Error && err.message ? err.message : String(err));

/** Deletes (to the restorable deleted list) every board in `ids`, pages first; answers whether all are gone. */
async function undoBoards(ids: readonly string[]): Promise<boolean> {
  let all = true;
  for (const id of [...ids].reverse()) {
    try {
      await deleteBoard(id);
    } catch (err) {
      // Already deleted is done; anything else keeps the journal so the next run tries again.
      if (!(err instanceof Error && /already deleted/i.test(err.message))) all = false;
    }
  }
  return all;
}

/**
 * "Use template" for a board pack: tables first, then the top board, then its pages. Answers the top board.
 * ALL OR NOTHING: a failure part-way deletes the boards already made (restorable) and throws the reason; an
 * earlier run that never finished is deleted first, so a retry resumes from a clean slate and never leaves a
 * second half board. EVERY USE IS ITS OWN DESIGN SYSTEM: the tables are a FRESH copy named for the board
 * ("Colors · Acme design system"), so two brands' boards never share a row; the copy's id is journaled, so
 * Try again continues the same copy. A finished run clears the journal.
 */
export async function makeBoardFromPack(
  key: string,
  organizationId: string | null,
  title: string,
  dispatch: AppDispatch,
  onStage?: (stage: string) => void,
  journalFor: (organizationId: string, templateId: string) => BoardPackRunJournal = boardPackRunJournal,
  /** "Start from a style": a reference-only pack (`listBoardStyles`) whose rows and cover fill the new board. */
  styleTemplateId?: string,
): Promise<LoadedBoard> {
  const templateId = templateIdOf(key);
  const template = await readSpaceTemplate(templateId);
  const board = template.pack.board;
  if (!board) throw new Error("This template makes no board.");
  // Read before anything is made: a style that cannot be read stops here, with nothing installed.
  const style = styleTemplateId ? await readSpaceTemplate(styleTemplateId) : null;
  // org-filter: write-target the template's tables and boards are filed in the active organization
  const orgId = await ensureOrgId(organizationId);
  const journal = journalFor(orgId, templateId);
  const unfinished = journal.read();
  if (unfinished?.length) {
    onStage?.("Clearing an unfinished copy…");
    if (await undoBoards(unfinished)) journal.write(null);
    else throw new Error("An earlier unfinished copy of this board could not be deleted. Delete it from the boards list, then use the template again.");
  }
  const tables = await installTemplateTables(template, orgId, dispatch, onStage, undefined, {
    title,
    installId: journal.readInstall?.() ?? null,
    onInstallId: (id) => journal.writeInstall?.(id),
  });
  // Planned before anything is written: a tile whose table was not made stops here, with no board made.
  const [top, ...pages] = planPackBoards(board, tables);
  const made: string[] = [];
  let filling = false;
  try {
    onStage?.("Making the board…");
    const root = await createBoardFromDocument({
      organizationId: orgId,
      title,
      doc: await materializeStarterNotes(style ? withStyleCover(top.doc, style) : top.doc, orgId),
      settings: settingsFor(top.layout),
    });
    made.push(root.id);
    journal.write(made);
    for (const [i, p] of pages.entries()) {
      onStage?.(`Pages ${i + 1}/${pages.length}`);
      const page = await createBoardFromDocument({
        organizationId: orgId,
        title: p.title,
        doc: await materializeStarterNotes(p.doc, orgId),
        settings: settingsFor(p.layout, root.id),
      });
      made.push(page.id);
      journal.write(made);
    }
    // The style's rows go in last, inside the all-or-nothing: a refused write deletes the boards made.
    if (style) {
      onStage?.("Filling the style…");
      filling = true;
      await fillFromStyle(style, tables, orgId);
    }
    journal.write(null);
    // Finished: the next use is a NEW board with its own fresh copy, never this one again.
    journal.writeInstall?.(null);
    return root;
  } catch (err) {
    const undone = await undoBoards(made);
    if (undone) journal.write(null);
    // A part-filled copy is never continued (a retry would write the same rows twice): the next run makes a fresh one.
    if (filling) journal.writeInstall?.(null);
    throw new Error(
      `The board was not finished (${reasonOf(err)}). ${
        undone ? "What was made so far was deleted; use the template again." : "Use the template again; the unfinished board will be deleted first."
      }`,
    );
  }
}
