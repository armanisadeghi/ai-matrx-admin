/**
 * BOARD TEMPLATE PACKS — a Space template pack that carries a `board` (lib/spaces-blocks/template-pack.ts
 * `PackBoard`), listed in the Board gallery beside the built-ins. ONE catalogue: the pack is a platform
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
import { createBoardFromDocument, LAYOUT_SETTING, PARENT_BOARD_SETTING, type LoadedBoard } from "../persistence/boardsService";
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

/** Every board pack the person can use, each with its sketch. */
export async function listBoardPacks(): Promise<BoardPackEntry[]> {
  const cards = await listSpaceTemplates(null, "board");
  return Promise.all(
    cards.map(async (c) => {
      const full = await readSpaceTemplate(c.id);
      const board = full.pack.board;
      const doc = board ? planPackBoards(board, sketchTables(allTables(full.spec).map((t) => t.token)))[0].doc : emptyDoc();
      return { key: `${PACK_PREFIX}${c.id}`, title: c.space.board?.title ?? c.space.title, summary: c.space.description, doc };
    }),
  );
}

function emptyDoc(): BoardDocument {
  return { camera: { x: 0, y: 0, z: 1 }, nodes: [], groups: [], edges: [], shapes: [] };
}

const settingsFor = (layout: "page" | "canvas", parentId?: string): JsonObject => ({
  ...(layout === "page" ? { [LAYOUT_SETTING]: "page" } : {}),
  ...(parentId ? { [PARENT_BOARD_SETTING]: parentId } : {}),
});

/** "Use template" for a board pack: tables first, then the top board, then its pages. Answers the top board. */
export async function makeBoardFromPack(
  key: string,
  organizationId: string | null,
  title: string,
  dispatch: AppDispatch,
  onStage?: (stage: string) => void,
): Promise<LoadedBoard> {
  const template = await readSpaceTemplate(templateIdOf(key));
  const board = template.pack.board;
  if (!board) throw new Error("This template makes no board.");
  // org-filter: write-target the template's tables and boards are filed in the active organization
  const orgId = await ensureOrgId(organizationId);
  const tables = await installTemplateTables(template, orgId, dispatch, onStage);
  const [top, ...pages] = planPackBoards(board, tables);
  onStage?.("Making the board…");
  const root = await createBoardFromDocument({
    organizationId: orgId,
    title,
    doc: await materializeStarterNotes(top.doc, orgId),
    settings: settingsFor(top.layout),
  });
  for (const [i, p] of pages.entries()) {
    onStage?.(`Pages ${i + 1}/${pages.length}`);
    await createBoardFromDocument({
      organizationId: orgId,
      title: p.title,
      doc: await materializeStarterNotes(p.doc, orgId),
      settings: settingsFor(p.layout, root.id),
    });
  }
  return root;
}
