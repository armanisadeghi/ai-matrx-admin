// Push to Google under an organization's review mode: approving must leave the link current, not stale
// (2026-10-11: it wrote cells, saved nothing, and the next push read as "changed in both places").
const assistRow: { data: unknown; error: null | { message: string } } = { data: null, error: null };
const writeGoogleLink = jest.fn(async () => ({ ok: true }));
const writePendingGoogleLink = jest.fn(async () => ({ ok: true }));
const pending = {
  intent: "push",
  fileId: "F1",
  assistId: "assist-2",
  kind: "google_sheet",
  connectionId: "conn-1",
  name: "Q3",
  queuedAt: "2026-10-11T00:00:00Z",
  localFingerprint: "fp-queued",
  localSnapshotId: "snap-queued",
};
const existing = {
  kind: "google_sheet",
  connectionId: "conn-1",
  fileId: "F1",
  name: "Q3",
  webViewLink: null,
  recordId: null,
  linkedAt: "x",
  lastSyncedAt: "x",
  remoteVersion: "sha:old",
  localSnapshotId: "snap-old",
  localFingerprint: "fp-old",
  lastDirection: "from_google",
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
  readRemoteVersion: async () => ({ version: "sha:after", webViewLink: null, name: "Q3" }),
}));

import { completePendingLink } from "../pending-link";
import type { GoogleFileLink } from "../link-store";

beforeEach(() => jest.clearAllMocks());

test("an applied reviewed push brings the link's sync point forward", async () => {
  assistRow.data = { status: "accepted", deleted_at: null, result: { state: "applied", output: {} } };
  const outcome = await completePendingLink("workbook", "wb-1", existing as unknown as GoogleFileLink);
  expect(outcome.state).toBe("linked");
  const link = (writeGoogleLink.mock.calls[0] as unknown[])[2] as GoogleFileLink;
  expect(link).toMatchObject({ fileId: "F1", remoteVersion: "sha:after", localFingerprint: "fp-queued", localSnapshotId: "snap-queued", lastDirection: "to_google" });
});

test("a push still waiting for review changes nothing", async () => {
  assistRow.data = { status: "pending", deleted_at: null, result: null };
  expect((await completePendingLink("workbook", "wb-1", existing as unknown as GoogleFileLink)).state).toBe("waiting");
  expect(writeGoogleLink).not.toHaveBeenCalled();
});

test("a rejected push is forgotten and the link stays as it was", async () => {
  assistRow.data = { status: "rejected", deleted_at: null, result: { state: "rejected" } };
  expect((await completePendingLink("workbook", "wb-1", existing as unknown as GoogleFileLink)).state).toBe("ended");
  expect(writeGoogleLink).not.toHaveBeenCalled();
  expect(writePendingGoogleLink).toHaveBeenCalledWith("workbook", "wb-1", null);
});
