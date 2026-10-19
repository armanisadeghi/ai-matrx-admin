import { collabRoomExists } from "@ai-matrx/data/realtime/collab";

import { announceIfStale, readCurrentContent } from "../current-content";
import { requestRaw } from "@/lib/python-client";
import { toast } from "@/lib/toast";

jest.mock("@ai-matrx/data/realtime/collab", () => ({ collabRoomExists: jest.fn() }));
jest.mock("@/lib/python-client", () => ({ requestRaw: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/lib/toast", () => ({ toast: { info: jest.fn() } }));

const exists = collabRoomExists as jest.Mock;
const server = requestRaw as jest.Mock;
const reply = (body: unknown) => server.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
const saved = jest.fn(async () => ({ text: "saved copy" }));

beforeEach(() => {
  jest.clearAllMocks();
  saved.mockResolvedValue({ text: "saved copy" });
});

describe("a reader outside the editor", () => {
  it("takes the folded content when the room is ahead of its last save", async () => {
    exists.mockResolvedValue(true);
    reply({ source: "folded", head_rev: 9, checkpoint_rev: 0, snapshot: { text: "saved copy plus what Maria just typed" } });
    const out = await readCurrentContent("udt_document", "doc-1", saved);
    expect(out).toEqual({ snapshot: { text: "saved copy plus what Maria just typed" }, source: "folded", notice: null });
    expect(saved).not.toHaveBeenCalled();
    expect(server.mock.calls[0][0]).toBe("/collab/rooms/doc-1/current");
  });

  it("takes the snapshot when there is no room, without calling the server", async () => {
    exists.mockResolvedValue(false);
    const out = await readCurrentContent("workbook", "wb-1", saved);
    expect(out).toEqual({ snapshot: { text: "saved copy" }, source: "snapshot", notice: null });
    expect(server).not.toHaveBeenCalled();
  });

  it("takes the checkpoint copy when the room has nothing past its last save", async () => {
    exists.mockResolvedValue(true);
    reply({ source: "checkpoint", head_rev: 3, checkpoint_rev: 3, snapshot: { text: "checkpoint" } });
    const out = await readCurrentContent("workbook", "wb-1", saved);
    expect(out.source).toBe("checkpoint");
    expect(out.notice).toBeNull();
    expect(out.snapshot).toEqual({ text: "checkpoint" });
  });

  it("says so, in plain words, when the room could not be folded", async () => {
    exists.mockResolvedValue(true);
    reply({ source: "stale", head_rev: 12, checkpoint_rev: 9, snapshot: { text: "checkpoint" } });
    const out = announceIfStale(await readCurrentContent("udt_document", "doc-1", saved));
    expect(out.source).toBe("stale");
    expect(out.notice).toBe("This is the last saved copy: 3 newer edits by people editing right now could not be included.");
    expect(toast.info).toHaveBeenCalledWith(out.notice);
  });

  it("falls back to the snapshot and says so when the server cannot be reached", async () => {
    exists.mockResolvedValue(true);
    server.mockRejectedValue(new Error("network"));
    const out = announceIfStale(await readCurrentContent("udt_document", "doc-1", saved));
    expect(out.snapshot).toEqual({ text: "saved copy" });
    expect(out.source).toBe("stale");
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the copy is current", async () => {
    exists.mockResolvedValue(false);
    announceIfStale(await readCurrentContent("udt_document", "doc-1", saved));
    expect(toast.info).not.toHaveBeenCalled();
  });
});
