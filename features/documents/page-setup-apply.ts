/**
 * Applies File → Page setup to the open document through Univer's own commands, so the change is
 * one undoable edit that travels with the snapshot (and so is saved, synced and reloaded like text).
 */
import { JSONX } from "@univerjs/core";

import {
  PAGE_COLOR_KEY,
  pageSetupCommandParams,
  pageSetupFromStyle,
  type PageSetupValues,
} from "@/features/documents/document-page-style";

/** The slice of the Univer facade this needs. Structural on purpose. */
export interface PageSetupApiLike {
  executeCommand(id: string, params?: object): Promise<unknown> | unknown;
  getActiveDocument?(): {
    getId(): string;
    getDocumentDataModel(): { getSnapshot(): { documentStyle?: Record<string, unknown> } };
  } | null;
}

export const PAGE_SETUP_COMMAND = "docs.command.page-setup";
const RICH_TEXT_EDITING_MUTATION = "doc.mutation.rich-text-editing";

/** The open document's current page settings, in the dialog's terms. */
export function readPageSetup(api: PageSetupApiLike | null | undefined): PageSetupValues {
  const style = api?.getActiveDocument?.()?.getDocumentDataModel().getSnapshot().documentStyle;
  return pageSetupFromStyle(style as Parameters<typeof pageSetupFromStyle>[0]);
}

/** Write the paper colour onto the document style (a plain key Univer carries and saves with the snapshot). */
async function writePageColor(api: PageSetupApiLike, color: string): Promise<void> {
  const doc = api.getActiveDocument?.();
  if (!doc) return;
  const style = doc.getDocumentDataModel().getSnapshot().documentStyle ?? {};
  const old = style[PAGE_COLOR_KEY];
  if (old === color || (old === undefined && color === "#ffffff")) return;
  const jsonX = JSONX.getInstance();
  const path = ["documentStyle", PAGE_COLOR_KEY];
  const action = old === undefined ? jsonX.insertOp(path, color) : jsonX.replaceOp(path, old, color);
  if (!action) return;
  await api.executeCommand(RICH_TEXT_EDITING_MUTATION, { unitId: doc.getId(), actions: action, textRanges: undefined });
}

export async function applyPageSetup(api: PageSetupApiLike, values: PageSetupValues): Promise<void> {
  const ok = await api.executeCommand(PAGE_SETUP_COMMAND, pageSetupCommandParams(values));
  if (ok === false) throw new Error("The editor did not accept the page settings. Nothing was changed.");
  await writePageColor(api, values.pageColor);
}
