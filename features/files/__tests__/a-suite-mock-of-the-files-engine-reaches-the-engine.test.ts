/**
 * A suite's `jest.mock` of a files-engine module must reach the ENGINE'S OWN callers.
 *
 * Break guarded: a jest setup file loading the files engine before the suite's mocks run (from
 * chat 5fa78b5231, `@ai-matrx/chat/host/ui-slots` → `defaults/files-ui` → the files API). The
 * engine's thunks then held the real API, the suite's mock never fired, and a save went to the
 * real Python client ("Couldn't verify your session") — 2 suites, 8 tests red with no hint why.
 * The fix lives in jest.setup.ts (chat's file defaults load on first use).
 */
const calls: string[] = [];
jest.mock("@ai-matrx/media/files/engine/api/files", () => ({
  uploadNewVersion: async (fileId: string) => {
    calls.push(fileId);
    throw new Error("the suite's mock answered");
  },
  getFileMetadata: jest.fn(),
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { configureStore } from "@reduxjs/toolkit";
import { cloudFilesReducer, upsertFile } from "@/features/files/redux/slice";
import { saveFileNewVersion } from "@/features/files/redux/thunks";

it("the engine's save thunk calls the suite's mocked files API, never the real one", async () => {
  const store = configureStore({
    reducer: { cloudFiles: cloudFilesReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(
    upsertFile({
      id: "file-1",
      ownerId: "user-1",
      fileName: "a.txt",
      filePath: "a.txt",
      mimeType: "text/plain",
      currentVersion: 1,
      deletedAt: null,
    }),
  );

  const result = await store.dispatch(saveFileNewVersion({ fileId: "file-1", content: "x" }));

  expect(calls).toEqual(["file-1"]);
  expect(result.meta.requestStatus).toBe("rejected");
  expect((result as { error?: { message?: string } }).error?.message).toBe("the suite's mock answered");
});
