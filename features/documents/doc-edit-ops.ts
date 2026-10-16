/**
 * The Univer-facing half of the Docs tools: insert text, markdown and bookmarks at the caret, move
 * the selection, read the live snapshot, set view-only. Every operation is a real Univer command.
 */

import { blockInsertPlan, bookmarkBody, collectBookmarks, insertableBody, type Bookmark } from "@/features/documents/doc-tools-core";

interface ApiLike {
  executeCommand(id: string, params?: object): Promise<unknown> | unknown;
  getActiveDocument?(): {
    getId(): string;
    save?(): unknown;
    setSelection?(a: number, b: number): void;
    getPermission?(): { setReadOnly(): Promise<void>; setEditable(editable?: boolean): Promise<void> };
  } | null;
}
interface InjectorLike {
  get<T>(token: unknown): T | undefined;
}
interface TextRangeLike {
  startOffset: number;
  endOffset: number;
}

export interface DocEditOps {
  insertText(text: string): Promise<boolean>;
  /** A block (building block) at a new paragraph, never mid-line. */
  insertMarkdown(markdown: string): Promise<boolean>;
  /** Move the caret to where a block goes (`blockInsertPlan`); false when there is no caret. */
  toBlockStart(): Promise<boolean>;
  bookmarks(): Bookmark[];
  addBookmark(name: string): Promise<boolean>;
  deleteBookmark(b: Bookmark): Promise<boolean>;
  goTo(offset: number): void;
  snapshot(): unknown;
  setViewOnly(viewOnly: boolean): Promise<void>;
  /** Calls back when Univer refuses an edit (Viewing mode); returns the unsubscribe. */
  onEditDenied(cb: () => void): Promise<() => void>;
  openImagePanel(): Promise<boolean>;
}

export function createDocEditOps(deps: { api: () => ApiLike | null; injector: () => InjectorLike | null }): DocEditOps {
  const doc = () => deps.api()?.getActiveDocument?.() ?? null;
  const snapshot = () => doc()?.save?.() ?? null;
  const range = async (): Promise<TextRangeLike | null> => {
    const { DocSelectionManagerService } = await import("@univerjs/docs");
    const live = deps.injector()?.get<{ getActiveTextRange?(): TextRangeLike | null | undefined }>(DocSelectionManagerService)?.getActiveTextRange?.();
    return live ?? null;
  };
  const exec = async (id: string, params: object) => (await deps.api()?.executeCommand(id, params)) !== false;
  const toBlockStart = async (): Promise<boolean> => {
    const d = doc();
    const r = await range();
    const stream = (snapshot() as { body?: { dataStream?: string } } | null)?.body?.dataStream;
    if (!d || !r || typeof stream !== "string") return false;
    const plan = blockInsertPlan(stream, r.startOffset);
    if (plan.breakAt === null) {
      d.setSelection?.(plan.at, plan.at);
      return true;
    }
    d.setSelection?.(plan.breakAt, plan.breakAt);
    return exec("doc.command.break-line", { unitId: d.getId() });
  };

  return {
    snapshot,
    async insertText(text) {
      if (!text || !(await range())) return false;
      return exec("doc.command.insert-special-character", { value: text });
    },
    toBlockStart,
    async insertMarkdown(markdown) {
      const d = doc();
      if (!d || !(await toBlockStart())) return false;
      return exec("doc.command.replace-selection", { unitId: d.getId(), body: insertableBody(markdown) });
    },
    bookmarks: () => collectBookmarks(snapshot()),
    async addBookmark(name) {
      const d = doc();
      const r = await range();
      if (!d || !r) return false;
      d.setSelection?.(r.startOffset, r.startOffset);
      const id = `bm_${Math.random().toString(36).slice(2, 10)}`;
      return exec("doc.command.replace-selection", { unitId: d.getId(), body: bookmarkBody(id, name) });
    },
    async deleteBookmark(b) {
      const d = doc();
      if (!d) return false;
      d.setSelection?.(b.offset + 1, b.offset + 1);
      return exec("doc.command.delete-left", { unitId: d.getId() });
    },
    async setViewOnly(viewOnly) {
      const perm = doc()?.getPermission?.();
      if (!perm) return;
      if (viewOnly) await perm.setReadOnly();
      else await perm.setEditable(true);
      // Univer's own refusal notice ("This content is protected…") stays off while viewing; the
      // editor shows ours through onEditDenied.
      const { IPermissionService } = await import("@univerjs/core");
      deps.injector()?.get<{ setShowComponents?(show: boolean): void }>(IPermissionService)?.setShowComponents?.(!viewOnly);
    },
    async onEditDenied(cb) {
      const { ErrorService } = await import("@univerjs/core");
      const errors = deps.injector()?.get<{ error$?: { subscribe(fn: (e: { code?: string }) => void): { unsubscribe(): void } } }>(ErrorService);
      const sub = errors?.error$?.subscribe((e) => {
        if (e.code === "PERMISSION_DENIED") cb();
      });
      return () => sub?.unsubscribe();
    },
    async openImagePanel() {
      return exec("sidebar.operation.doc-image", { value: "doc-image" });
    },
    goTo(offset) {
      doc()?.setSelection?.(offset, offset);
    },
  };
}

/** Write one plain key onto the document style (it rides the snapshot like the paper colour does). */
export async function writeDocumentStyleKey(api: ApiLike, key: string, value: string): Promise<void> {
  const doc = api.getActiveDocument?.();
  if (!doc) return;
  const style = (doc as unknown as { getDocumentDataModel?(): { getSnapshot(): { documentStyle?: Record<string, unknown> } } }).getDocumentDataModel?.()?.getSnapshot().documentStyle ?? {};
  const old = style[key];
  if (old === value) return;
  const { JSONX } = await import("@univerjs/core");
  const jsonX = JSONX.getInstance();
  const path = ["documentStyle", key];
  const action = old === undefined ? jsonX.insertOp(path, value) : jsonX.replaceOp(path, old, value);
  if (!action) return;
  await api.executeCommand("doc.mutation.rich-text-editing", { unitId: doc.getId(), actions: action, textRanges: undefined });
}
