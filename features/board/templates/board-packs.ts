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
import { installTemplateTables, listSpaceTemplates, readSpaceTemplate } from "@/features/spaces/templates/use-pack";
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
      return { key: `${PACK_PREFIX}${c.id}`, title: c.space.board?.title ?? c.space.title, summary: c.space.description, doc };
    }),
  );
  return read.flatMap((r, i) => {
    if (r.status === "fulfilled") return [r.value];
    reportUnreadablePack(`The board template "${cards[i].space?.title ?? cards[i].catalogue_id}" (${cards[i].catalogue_id})`, r.reason);
    return [];
  });
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
 * second half board. A finished run clears the journal: pressing Use again is asking for a NEW board (the
 * tables are the same — the install door answers `already`).
 */
export async function makeBoardFromPack(
  key: string,
  organizationId: string | null,
  title: string,
  dispatch: AppDispatch,
  onStage?: (stage: string) => void,
  journalFor: (organizationId: string, templateId: string) => BoardPackRunJournal = boardPackRunJournal,
): Promise<LoadedBoard> {
  const templateId = templateIdOf(key);
  const template = await readSpaceTemplate(templateId);
  const board = template.pack.board;
  if (!board) throw new Error("This template makes no board.");
  // org-filter: write-target the template's tables and boards are filed in the active organization
  const orgId = await ensureOrgId(organizationId);
  const journal = journalFor(orgId, templateId);
  const unfinished = journal.read();
  if (unfinished?.length) {
    onStage?.("Clearing an unfinished copy…");
    if (await undoBoards(unfinished)) journal.write(null);
    else throw new Error("An earlier unfinished copy of this board could not be deleted. Delete it from the boards list, then use the template again.");
  }
  const tables = await installTemplateTables(template, orgId, dispatch, onStage);
  // Planned before anything is written: a tile whose table was not made stops here, with no board made.
  const [top, ...pages] = planPackBoards(board, tables);
  const made: string[] = [];
  try {
    onStage?.("Making the board…");
    const root = await createBoardFromDocument({
      organizationId: orgId,
      title,
      doc: await materializeStarterNotes(top.doc, orgId),
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
    journal.write(null);
    return root;
  } catch (err) {
    const undone = await undoBoards(made);
    if (undone) journal.write(null);
    throw new Error(
      `The board was not finished (${reasonOf(err)}). ${
        undone ? "What was made so far was deleted; use the template again." : "Use the template again; the unfinished board will be deleted first."
      }`,
    );
  }
}
