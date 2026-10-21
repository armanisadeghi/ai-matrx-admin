/**
 * BOARD TEMPLATES (SI-13) on the SAME mechanism as page templates: a board is labeled through a `labeled`
 * association to the `document_label`/`template` category (`features/spaces/state/templates.ts`, source
 * `board`); "Use template" is `duplicateBoard`. Built-in templates (`builtin.ts`) ship from code.
 */

import { listTemplateIds, setTemplate } from "@/features/spaces/state/templates";
import {
  createBoardFromDocument,
  duplicateBoard,
  getBoardsByIds,
  type LoadedBoard,
} from "../persistence/boardsService";
import type { JsonObject } from "@/types/json";
import { cloneBoardContent } from "./clone-content";
import { BUILTIN_BOARD_TEMPLATES, builtinTemplateByKey } from "./builtin";
import type { BoardDocument } from "../board/document";
import { materializeStarterNotes } from "./starter-notes";
import { isPackKey, listBoardPacks, makeBoardFromPack, reportUnreadablePack } from "./board-packs";
import type { AppDispatch } from "@/lib/redux/store";

export interface BoardTemplateEntry {
  /** `builtin:<id>`, `pack:<template id>` (a template pack that makes a board) or the saved board's id. */
  key: string;
  title: string;
  /** Owned by the platform: a built-in from code or a published board pack. */
  builtin: boolean;
  /** The tiles to preview. */
  doc: BoardDocument;
  /** A board pack that starts empty (`board.startsEmpty`): its start offers the AI build first. */
  startsEmpty?: boolean;
}

/** Built-in templates first, then the published board packs, then the person's saved ones (boards labeled `template` that they can read). */
export async function listBoardTemplates(): Promise<BoardTemplateEntry[]> {
  const builtin: BoardTemplateEntry[] = BUILTIN_BOARD_TEMPLATES.map((t) => ({ key: t.key, title: t.title, builtin: true, doc: t.build() }));
  // A failed pack read never hides the built-ins or the saved boards: it is reported and the packs are left out.
  const [ids, packs] = await Promise.all([
    listTemplateIds("board"),
    listBoardPacks().catch((err: unknown) => (reportUnreadablePack("The board template packs", err), [])),
  ]);
  const packed = packs.map((p) => ({ key: p.key, title: p.title, builtin: true, doc: p.doc, ...(p.startsEmpty ? { startsEmpty: true } : {}) }));
  const saved = (await getBoardsByIds(ids)).map((b) => ({ key: b.id, title: b.title, builtin: false, doc: b.doc }));
  return [...builtin, ...packed, ...saved];
}

export function isBoardTemplate(templateIds: readonly string[] | null, boardId: string): boolean {
  return !!templateIds && templateIds.includes(boardId);
}

export const saveBoardAsTemplate = (boardId: string, on: boolean) => setTemplate(boardId, on, "board");

/**
 * The default name of a board made from a template: "<template name> — <date>", so a copy never reads
 * like the original (or like a brand's Studio) in a list or a picker.
 */
export function templateBoardTitle(templateTitle: string, now: Date = new Date()): string {
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${templateTitle.trim() || "Board"} — ${date}`;
}

/** "Use template": a new board in the organization, from a built-in or a saved template. */
export async function makeBoardFromTemplate(
  key: string,
  organizationId: string | null,
  title: string,
  settings?: JsonObject,
  /** Built-in templates only: adds to the fresh document before it is stored (the Studio adds the brand's own accounts). */
  extend?: (doc: BoardDocument) => BoardDocument,
  /** Board packs only: installing their tables copies the template's assistant (host steps need the store). */
  pack?: { dispatch: AppDispatch; onStage?: (stage: string) => void; styleTemplateId?: string },
): Promise<LoadedBoard> {
  if (isPackKey(key)) {
    if (!pack) throw new Error("This template installs tables; it needs the app's store to do so.");
    return makeBoardFromPack(key, organizationId, title, pack.dispatch, pack.onStage, undefined, pack.styleTemplateId);
  }
  const builtin = builtinTemplateByKey(key);
  if (builtin) {
    const built = builtin.build();
    // Its notes are filed now, in this board's organization (`starter-notes.ts`).
    const doc = await materializeStarterNotes(built, organizationId);
    return createBoardFromDocument({ organizationId, title, doc: extend ? extend(doc) : doc, settings });
  }
  // A saved template is a board: its notes and documents are the AUTHOR'S records, so the copy gets clones of them
  // (`clone-content.ts` holds the per-type ruling), never the same records.
  return duplicateBoard(key, { title, dropBrand: true, cloneContent: (doc) => cloneBoardContent(doc) });
}
