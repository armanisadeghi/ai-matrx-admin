/**
 * Google's rule for the "/" insert menu, applied to Univer's (F-B, adversarial walk 4).
 *
 * Univer 1.0.4 opens its insert menu on EVERY "/" and keeps focus in the menu, so "Date 10/22/2026" became
 * "Date 10": the "/" and every key after it were swallowed. Google Docs opens it only at the start of a paragraph
 * (an empty one) or after a space, and typing that matches no command closes the menu and keeps every character.
 *
 * Univer's own service decides in two private methods (`_shouldOpenSlashMenu` for the key, `_shouldOpenSlashMenuFromInput`
 * for the text input). The rule is added to both on the class once; a "/" that fails it is an ordinary character.
 * When the menu does open, a printable key closes it and types "/" plus that key into the document.
 * `univer-slash-menu-rule.test.ts` fails if a Univer upgrade renames what this relies on.
 */

import { ICommandService } from "@univerjs/core";
import { DocParagraphMenuService } from "@univerjs/docs-ui";

const INSERT_TEXT = "doc.command.insert-text";

/** True when "/" at `offset` of the document stream should open the insert menu. */
export function slashMayOpenAt(dataStream: string, offset: number): boolean {
  if (offset <= 0) return dataStream.length === 0 || isParagraphEnd(dataStream[0]);
  const before = dataStream[offset - 1] ?? "";
  const after = dataStream[offset] ?? "";
  // Start of a paragraph (after a paragraph end or a table-cell marker): only an EMPTY one.
  if (before === "\r" || before === "\n" || before < " ") return after === "" || isParagraphEnd(after);
  // After a space (or any other blank).
  return /\s/.test(before);
}

function isParagraphEnd(c: string | undefined): boolean {
  return c === "\r" || c === "\n";
}

interface SlashService {
  _context?: { unit?: { getBody?: () => { dataStream?: string } | undefined }; unitId?: string; with?: <T>(id: unknown) => T };
  _isSlashMenuActive?: boolean;
  _matrxSlash?: { offset: number; segmentId: string };
  _docSelectionRenderService?: { focus?: () => void };
  _getCollapsedTextRange: (config: unknown) => { startOffset: number; segmentId?: string } | null;
  _shouldOpenSlashMenu: (config: unknown) => boolean;
  _shouldOpenSlashMenuFromInput: (config: unknown) => boolean;
  _openSlashMenu: (config: unknown) => boolean;
  hideParagraphMenu: (force?: boolean) => void;
}

function mayOpen(svc: SlashService, config: unknown): boolean {
  const range = svc._getCollapsedTextRange(config);
  if (!range) return true; // not ours to judge: Univer's own answer stands
  // Headers and footers are separate streams; the rule reads the body only.
  if (range.segmentId) return true;
  const stream = svc._context?.unit?.getBody?.()?.dataStream;
  if (typeof stream !== "string") return true;
  return slashMayOpenAt(stream, range.startOffset);
}

const active = new Set<SlashService>();
let installed = false;

/** Printable key while the menu is open: close it and keep the characters. Returns true when it handled the key. */
export function typeThroughSlashMenu(svc: SlashService, text: string): boolean {
  const slash = svc._matrxSlash;
  if (!slash) return false;
  const commands = svc._context?.with?.<{ syncExecuteCommand: (id: string, params: unknown) => unknown }>(ICommandService);
  svc.hideParagraphMenu(true);
  if (!commands) return false;
  commands.syncExecuteCommand(INSERT_TEXT, {
    unitId: svc._context?.unitId,
    segmentId: slash.segmentId,
    body: { dataStream: `/${text}` },
    range: { startOffset: slash.offset, endOffset: slash.offset, collapsed: true },
  });
  queueMicrotask(() => svc._docSelectionRenderService?.focus?.());
  return true;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
  for (const svc of [...active]) {
    if (!svc._isSlashMenuActive) {
      active.delete(svc);
      continue;
    }
    if (typeThroughSlashMenu(svc, event.key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
}

/** Idempotent: patches Univer's paragraph-menu service class once per page. Returns false when Univer changed shape. */
export function installSlashMenuRule(): boolean {
  const proto = DocParagraphMenuService.prototype as unknown as SlashService & { __matrxSlashRule?: boolean };
  if (proto.__matrxSlashRule) return true;
  if (
    typeof proto._shouldOpenSlashMenu !== "function" ||
    typeof proto._shouldOpenSlashMenuFromInput !== "function" ||
    typeof proto._openSlashMenu !== "function" ||
    typeof proto._getCollapsedTextRange !== "function"
  ) {
    console.warn("[docs] Univer's slash menu changed shape; Google's '/' rule was not applied");
    return false;
  }
  const byKey = proto._shouldOpenSlashMenu;
  const byInput = proto._shouldOpenSlashMenuFromInput;
  const open = proto._openSlashMenu;
  proto._shouldOpenSlashMenu = function (this: SlashService, config: unknown) {
    return byKey.call(this, config) && mayOpen(this, config);
  };
  proto._shouldOpenSlashMenuFromInput = function (this: SlashService, config: unknown) {
    return byInput.call(this, config) && mayOpen(this, config);
  };
  proto._openSlashMenu = function (this: SlashService, config: unknown) {
    const range = this._getCollapsedTextRange(config);
    if (range) this._matrxSlash = { offset: range.startOffset, segmentId: range.segmentId ?? "" };
    const opened = open.call(this, config);
    if (opened) active.add(this);
    return opened;
  };
  proto.__matrxSlashRule = true;
  if (typeof document !== "undefined") document.addEventListener("keydown", onKeydown, true);
  return true;
}
