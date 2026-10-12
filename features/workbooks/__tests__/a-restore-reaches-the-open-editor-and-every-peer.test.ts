/**
 * A RESTORE (OR "USE GOOGLE'S") IS WHAT EVERY OPEN EDITOR SHOWS — NOT JUST THE DATABASE.
 *
 * Before 2026-10-11 a history restore only wrote a snapshot row: the open
 * workbook (collab on, so the realtime reload was off) kept the old content,
 * peers never heard, and the next autosave wrote the old content back over
 * the restore. Google's "Update" disposed the Univer unit by hand and threw
 * `getUnitId` of null. Now every whole-content replacement goes through ONE
 * door (`lib/univer/openEditorContent`): the open editor swaps in the saved
 * snapshot, its pending save writes nothing, and the collab room empties its
 * mutation log and tells every peer to reload.
 *
 * Breaks that turn this red: a replacer that is never called; a collab room
 * that does not tell peers (or keeps the old log for a joiner to replay); a
 * joiner reloading on a stale signal; a swap whose own mutations broadcast;
 * a document whose pending save writes the old body after a restore.
 */
import * as Y from "yjs";
import { configureStore } from "@reduxjs/toolkit";

import {
  WorkbookCollabSession,
  type CollabMutationInfo,
  type CommandServiceLike,
} from "@/features/workbooks/collab/WorkbookCollabSession";
import { registerOpenEditorContent, showSavedSnapshot } from "@/lib/univer/openEditorContent";
import { defineWorkingCopyKind } from "@/lib/working-copy/workingCopyKind";
import workingCopiesReducer from "@/lib/working-copy/workingCopySlice";
import {
  DocumentModel,
  type DocumentModelDeps,
  type DocumentSnapshotData,
} from "@/features/documents/document-model/documentModel";

// ── an in-memory room: every doc update reaches every other member ─────────
function makeRoom() {
  const docs = new Set<Y.Doc>();
  return ({ doc }: { doc: Y.Doc }) => {
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      for (const other of docs) if (other !== doc) Y.applyUpdate(other, update, "remote");
    };
    return {
      async connect() {
        for (const other of docs) Y.applyUpdate(doc, Y.encodeStateAsUpdate(other), "remote");
        docs.add(doc);
        doc.on("update", onUpdate);
      },
      disconnect() {
        doc.off("update", onUpdate);
        docs.delete(doc);
      },
      async ready() {},
    };
  };
}

function fakeCommandService() {
  const listeners = new Set<(info: CollabMutationInfo) => void>();
  const applied: string[] = [];
  const service: CommandServiceLike = {
    onMutationExecutedForCollab: (listener) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    syncExecuteCommand: (id) => {
      applied.push(id);
      return true;
    },
  };
  const emit = (id: string) => {
    for (const l of listeners) l({ id, type: 2, params: { v: id } });
  };
  return { service, emit, applied };
}

async function member(room: ReturnType<typeof makeRoom>, uid: string) {
  const cmd = fakeCommandService();
  const replaced: string[] = [];
  const session = new WorkbookCollabSession({
    workbookId: "wb-1",
    uid,
    clientId: `client-${uid}`,
    commandService: cmd.service,
    makeProvider: room,
    onReplaced: (snapshotId) => replaced.push(snapshotId),
  });
  await session.start();
  return { session, cmd, replaced };
}

describe("the collab room carries a whole-content replacement", () => {
  it("tells every peer, empties the shared log, and never broadcasts the swap itself", async () => {
    const room = makeRoom();
    const ana = await member(room, "uid-ana");
    const ben = await member(room, "uid-ben");

    ana.cmd.emit("sheet.mutation.set-range-values");
    expect(ben.cmd.applied).toEqual(["sheet.mutation.set-range-values"]);
    expect(ana.session.logLength()).toBe(1);

    // Ana's editor swaps its unit: what Univer emits meanwhile is not an edit.
    ana.session.muteWhile(() => ana.cmd.emit("sheet.mutation.insert-sheet"));
    expect(ben.cmd.applied).toEqual(["sheet.mutation.set-range-values"]);

    ana.session.announceReplaced("snap-restored");
    expect(ben.replaced).toEqual(["snap-restored"]);
    expect(ana.replaced).toEqual([]); // the announcer never reloads itself
    expect(ana.session.logLength()).toBe(0);
    expect(ben.session.logLength()).toBe(0);

    // A joiner loads the newest snapshot itself: an old signal is not news,
    // and it has no old mutations to replay onto that snapshot.
    const cy = await member(room, "uid-cy");
    expect(cy.replaced).toEqual([]);
    expect(cy.cmd.applied).toEqual([]);

    // A later replacement reaches the joiner too.
    ben.session.announceReplaced("snap-google");
    expect(cy.replaced).toEqual(["snap-google"]);
    expect(ana.replaced).toEqual(["snap-google"]);

    for (const m of [ana, ben, cy]) m.session.stop();
  });
});

describe("the in-cell editor's scratch document never travels", () => {
  it("typing into a cell sends set-range-values, not doc.mutation.rich-text-editing", async () => {
    const room = makeRoom();
    const ana = await member(room, "uid-ana");
    const ben = await member(room, "uid-ben");
    ana.cmd.emit("doc.mutation.rich-text-editing");
    ana.cmd.emit("sheet.mutation.set-range-values");
    expect(ana.session.logLength()).toBe(1);
    expect(ben.cmd.applied).toEqual(["sheet.mutation.set-range-values"]);
    for (const m of [ana, ben]) m.session.stop();
  });
});

describe("the one door", () => {
  it("reaches the record's open editor, and a released editor no longer", async () => {
    const shown: string[] = [];
    const release = registerOpenEditorContent("workbook", "wb-7", (row) => {
      shown.push(row.id);
    });
    expect(await showSavedSnapshot("workbook", "wb-7", { id: "snap-1", snapshot: {} })).toBe(true);
    expect(await showSavedSnapshot("document", "wb-7", { id: "snap-2", snapshot: {} })).toBe(false);
    expect(shown).toEqual(["snap-1"]);

    // A newer editor of the same record replaced the first: the old release must not remove it.
    const second: string[] = [];
    const releaseSecond = registerOpenEditorContent("workbook", "wb-7", (row) => {
      second.push(row.id);
    });
    release();
    expect(await showSavedSnapshot("workbook", "wb-7", { id: "snap-3", snapshot: {} })).toBe(true);
    expect(second).toEqual(["snap-3"]);
    releaseSecond();
    expect(await showSavedSnapshot("workbook", "wb-7", { id: "snap-4", snapshot: {} })).toBe(false);
  });
});

describe("a document restore", () => {
  const doc = (text: string) => ({ id: "unit-1", body: { dataStream: `${text}\r\n` } }) as unknown as DocumentSnapshotData;
  const textOf = (snapshot: DocumentSnapshotData | null) =>
    ((snapshot as { body?: { dataStream?: string } } | null)?.body?.dataStream ?? "").replace(/\r\n$/, "");
  const flush = async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows the restored body in the view, tells the room, and the pending save writes nothing", async () => {
    const saved: string[] = [];
    const deps: DocumentModelDeps = {
      loadLatest: async () => ({ id: "snap-1", snapshot: doc("Launch plan v2") }),
      save: async ({ snapshot }) => {
        saved.push(textOf(snapshot));
        return { id: `snap-mine-${saved.length}`, createdBy: null };
      },
    };
    const kind = defineWorkingCopyKind<DocumentModel>({
      entity: `doc-restore-${Math.random().toString(36).slice(2, 8)}`,
      delay: () => 2500,
      createEngine: (handle) => new DocumentModel(handle, deps),
      engineBusy: (model) => model.hasViews(),
      save: async ({ engine, reason }) => ({ savedAt: (await engine!.write(reason)) ? Date.now() : null }),
    });
    const store = configureStore({ reducer: { workingCopies: workingCopiesReducer } });
    const release = kind.attach("plan", store);
    const model = kind.engine("plan")!;
    await model.openingSnapshot(() => doc(""));

    let shown = doc("Launch plan v2");
    const listeners = new Set<(info: CollabMutationInfo) => void>();
    const detach = model.attachView({
      commandService: {
        onMutationExecutedForCollab: (listener) => {
          listeners.add(listener);
          return { dispose: () => listeners.delete(listener) };
        },
        syncExecuteCommand: () => true,
      },
      snapshot: () => shown,
      remount: (snapshot) => {
        shown = snapshot;
      },
      editable: () => true,
    });
    const announced: string[] = [];
    await model.startCollab(async () => ({
      stop: () => {},
      isHost: () => true,
      announceReplaced: (id) => announced.push(id),
    }));

    // An unsaved edit is pending when the person restores an older version.
    shown = doc("Launch plan v2 with a typo");
    for (const l of listeners) l({ id: "doc.mutation.rich-text-editing", type: 2, params: {} });

    model.replaceContent({ id: "snap-restored", snapshot: doc("Launch plan v1") });
    expect(textOf(shown)).toBe("Launch plan v1");
    expect(announced).toEqual(["snap-restored"]);

    jest.advanceTimersByTime(10_000);
    await flush();
    expect(saved).toEqual([]); // the old body is never written back over the restore

    detach();
    release();
  });
});
