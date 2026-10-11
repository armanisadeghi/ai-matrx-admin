// When review mode turns "Create Google Sheet" into an approval request, approving it must leave the record LINKED
// (2026-10-10: the approval wrote values and the link was never saved). The record remembers the approval's id;
// once the receipt says applied, the link is saved from the receipt's file.
const assistRow: { data: unknown; error: null | { message: string } } = { data: null, error: null };
const writeGoogleLink = jest.fn(async () => ({ ok: true }));
const writePendingGoogleLink = jest.fn(async () => ({ ok: true }));
const pending = {
  assistId: "assist-1",
  kind: "google_sheet",
  connectionId: "conn-1",
  name: "Q3",
  queuedAt: "2026-10-10T00:00:00Z",
  localFingerprint: "fp",
  localSnapshotId: "snap",
};

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => assistRow }) }) }) }),
  },
}));
jest.mock("../link-store", () => ({
  readPendingGoogleLink: async () => pending,
  writeGoogleLink: (...a: unknown[]) => (writeGoogleLink as (...x: unknown[]) => unknown)(...a),
  writePendingGoogleLink: (...a: unknown[]) => (writePendingGoogleLink as (...x: unknown[]) => unknown)(...a),
}));
jest.mock("../linkedService", () => ({
  readRemoteVersion: async () => ({ version: "sha:abc", webViewLink: "https://docs.google.com/x", name: "Q3" }),
}));

import { completePendingLink } from "../pending-link";

beforeEach(() => jest.clearAllMocks());

test("an applied approval saves the link from the receipt's file", async () => {
  assistRow.data = { status: "accepted", deleted_at: null, result: { state: "applied", output: { file_id: "F1", name: "Q3 sheet" } } };
  const outcome = await completePendingLink("workbook", "wb-1");
  expect(outcome.state).toBe("linked");
  expect(writeGoogleLink).toHaveBeenCalledTimes(1);
  const link = (writeGoogleLink.mock.calls[0] as unknown[])[2] as { fileId: string; remoteVersion: string; localFingerprint: string };
  expect(link).toMatchObject({ fileId: "F1", remoteVersion: "sha:abc", localFingerprint: "fp" });
});

test("a request still waiting saves nothing", async () => {
  assistRow.data = { status: "pending", deleted_at: null, result: null };
  expect((await completePendingLink("workbook", "wb-1")).state).toBe("waiting");
  expect(writeGoogleLink).not.toHaveBeenCalled();
});

test("a rejected request is forgotten, never linked", async () => {
  assistRow.data = { status: "rejected", deleted_at: null, result: { state: "rejected" } };
  expect((await completePendingLink("workbook", "wb-1")).state).toBe("ended");
  expect(writeGoogleLink).not.toHaveBeenCalled();
  expect(writePendingGoogleLink).toHaveBeenCalledWith("workbook", "wb-1", null);
});
