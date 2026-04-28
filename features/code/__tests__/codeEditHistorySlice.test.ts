/**
 * codeEditHistorySlice reducer tests.
 *
 * Covers the parts that aren't trivial:
 *   • per-(message, file) idempotency on stage-then-restage.
 *   • status counter recomputation as edits resolve.
 *   • mergeFromServer preserving locally-pending entries.
 *   • clearConversation cleaning all three indexes.
 *   • pendingWrites lifecycle (queued on record, dropped on persist).
 */

import reducer, {
  clearConversation,
  markPersisted,
  mergeFromServer,
  recordPatchApplied,
  recordPatchRejected,
  recordRevert,
  type CodeEditHistoryState,
  type MessageFileSnapshot,
} from "../redux/codeEditHistorySlice";
import { fileIdentityKey, type FileIdentity } from "../utils/fileIdentity";

const ID: FileIdentity = {
  adapter: "library",
  path: "library:/foo.ts",
  libraryFileId: "lib-1",
};

const fresh = (): CodeEditHistoryState =>
  reducer(undefined, { type: "@@INIT" });

const applyPayload = (
  overrides: Partial<Parameters<typeof recordPatchApplied>[0]> = {},
) =>
  recordPatchApplied({
    messageId: "msg-1",
    conversationId: "conv-1",
    fileIdentity: ID,
    beforeContent: "BEFORE",
    afterContent: "AFTER",
    patchId: "req-1:tab-1:0",
    blockIndex: 0,
    search: "S",
    replace: "R",
    ...overrides,
  });

describe("codeEditHistorySlice", () => {
  it("indexes a recorded edit by conversation, message, and file", () => {
    const state = reducer(fresh(), applyPayload());
    expect(state.byConversation["conv-1"]).toHaveLength(1);
    expect(state.byMessage["msg-1"]).toHaveLength(1);
    expect(state.byFile[fileIdentityKey(ID)]).toHaveLength(1);
    const snap = state.byMessage["msg-1"][0];
    expect(snap.beforeContent).toBe("BEFORE");
    expect(snap.afterContent).toBe("AFTER");
    expect(snap.edits).toHaveLength(1);
    expect(snap.edits[0].status).toBe("applied");
    expect(snap.status).toBe("completed");
  });

  it("re-recording the same patchId replaces the edit, not appends", () => {
    let state = reducer(fresh(), applyPayload());
    state = reducer(state, applyPayload({ replace: "R-NEW" }));
    expect(state.byMessage["msg-1"][0].edits).toHaveLength(1);
    expect(state.byMessage["msg-1"][0].edits[0].replace).toBe("R-NEW");
  });

  it("queues a pendingWrite for every record action", () => {
    const state = reducer(fresh(), applyPayload());
    const writeKey = `msg-1:${fileIdentityKey(ID)}`;
    expect(state.pendingWrites[writeKey]).toBeDefined();
    expect(state.pendingWrites[writeKey].messageId).toBe("msg-1");
  });

  it("markPersisted drops the pendingWrite and stamps the snapshot id", () => {
    let state = reducer(fresh(), applyPayload());
    state = reducer(
      state,
      markPersisted({
        messageId: "msg-1",
        fileIdentity: ID,
        messageFileId: "mf-1",
        editIds: [{ blockIndex: 0, id: "edit-1" }],
        persistedAt: "2026-01-01T00:00:00Z",
      }),
    );
    expect(state.pendingWrites).toEqual({});
    const snap = state.byMessage["msg-1"][0];
    expect(snap.id).toBe("mf-1");
    expect(snap.persistedAt).toBe("2026-01-01T00:00:00Z");
    expect(snap.edits[0].id).toBe("edit-1");
  });

  it("recordRevert flips an applied edit to reverted and re-queues the write", () => {
    let state = reducer(fresh(), applyPayload());
    state = reducer(
      state,
      recordRevert({
        messageId: "msg-1",
        fileIdentity: ID,
        patchIds: ["req-1:tab-1:0"],
      }),
    );
    const snap = state.byMessage["msg-1"][0];
    expect(snap.edits[0].status).toBe("reverted");
    expect(snap.edits[0].revertedAt).toBeDefined();
    expect(snap.status).toBe("reverted"); // applied=0, reverted=1
    expect(state.pendingWrites).not.toEqual({});
  });

  it("recordPatchRejected counts toward the rejected total", () => {
    const state = reducer(
      fresh(),
      recordPatchRejected({
        messageId: "msg-1",
        conversationId: "conv-1",
        fileIdentity: ID,
        beforeContent: "X",
        afterContent: "X",
        patchId: "req-1:tab-1:0",
        blockIndex: 0,
        search: "S",
        replace: "R",
        reason: "user rejected",
      }),
    );
    const snap = state.byMessage["msg-1"][0];
    expect(snap.edits[0].status).toBe("rejected");
    expect(snap.status).toBe("completed"); // any rejected counts as resolved
  });

  it("mergeFromServer wipes existing rows but preserves locally-pending ones", () => {
    let state = reducer(fresh(), applyPayload());
    // Mark this one as persisted so it has an id (server-canonical).
    state = reducer(
      state,
      markPersisted({
        messageId: "msg-1",
        fileIdentity: ID,
        messageFileId: "mf-1",
        editIds: [{ blockIndex: 0, id: "edit-1" }],
        persistedAt: "2026-01-01T00:00:00Z",
      }),
    );
    // Add a brand-new pending entry that hasn't been persisted yet.
    state = reducer(
      state,
      applyPayload({
        messageId: "msg-2",
        patchId: "req-1:tab-1:1",
        blockIndex: 1,
        afterContent: "PENDING",
      }),
    );

    // Server now returns an updated msg-1 plus a brand-new msg-3.
    const incoming: MessageFileSnapshot[] = [
      {
        id: "mf-1",
        messageId: "msg-1",
        conversationId: "conv-1",
        fileAdapter: ID.adapter,
        filePath: ID.path,
        libraryFileId: ID.libraryFileId,
        beforeContent: "BEFORE",
        afterContent: "SERVER-AFTER",
        edits: [],
        status: "completed",
        appliedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "mf-3",
        messageId: "msg-3",
        conversationId: "conv-1",
        fileAdapter: ID.adapter,
        filePath: ID.path,
        libraryFileId: ID.libraryFileId,
        beforeContent: "BEFORE",
        afterContent: "AFTER-3",
        edits: [],
        status: "completed",
        appliedAt: "2026-01-02T00:00:00Z",
      },
    ];
    state = reducer(
      state,
      mergeFromServer({ conversationId: "conv-1", snapshots: incoming }),
    );
    const conv = state.byConversation["conv-1"];
    const ids = conv.map((s) => s.messageId).sort();
    // server msg-1 + server msg-3 + locally-pending msg-2.
    expect(ids).toEqual(["msg-1", "msg-2", "msg-3"]);
    expect(state.hydrationStatus["conv-1"]).toBe("loaded");
  });

  it("clearConversation wipes all three indexes for that conversation", () => {
    let state = reducer(fresh(), applyPayload());
    state = reducer(state, clearConversation({ conversationId: "conv-1" }));
    expect(state.byConversation["conv-1"]).toBeUndefined();
    expect(state.byMessage["msg-1"]).toEqual([]);
    expect(state.byFile[fileIdentityKey(ID)]).toEqual([]);
    expect(state.hydrationStatus["conv-1"]).toBeUndefined();
  });
});
