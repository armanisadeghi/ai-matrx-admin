/**
 * @jest-environment node
 *
 * Single-flight clean contract (owner ruling 2026-10-11): a 409
 * `clean_in_progress` is joined (never an error, never retried); an
 * already-cleaned doc answers with its text and no second request; auto-run
 * sends force=false and manual buttons force=true; two callers on one doc
 * produce one winner and one joiner.
 */
const requestRaw = jest.fn();
jest.mock("@/lib/python-client", () => ({
  requestRaw: (...args: unknown[]) => requestRaw(...args),
}));

import { BackendApiError } from "@/lib/api/errors";
import { streamPdfClean } from "../streamPdf";
import { cleanDocument } from "../cleanDocument";

const DOC = "11111111-1111-1111-1111-111111111111";
const LIVE = "root-request-1";

function ndjson(events: Array<{ event: string; data: unknown }>): Response {
  return new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}
function conflict(): BackendApiError {
  return new BackendApiError({
    code: "conflict",
    detail: "clean in progress",
    userMessage: "A clean is already running",
    status: 409,
    details: { code: "clean_in_progress", request_id: LIVE, execution_id: "exec-1" },
  });
}
const bodyOf = (call: number) => JSON.parse(requestRaw.mock.calls[call][1].body);

beforeEach(() => requestRaw.mockReset());

describe("force flag", () => {
  it("auto-run sends force=false, buttons send force=true", async () => {
    requestRaw.mockImplementation(async () => ndjson([{ event: "end", data: {} }]));
    await streamPdfClean({ docId: DOC, force: false });
    await streamPdfClean({ docId: DOC, force: true });
    expect(bodyOf(0)).toEqual({ force: false });
    expect(bodyOf(1)).toEqual({ force: true });
  });
});

describe("409 clean_in_progress", () => {
  it("is returned as in-progress (no throw) with the live run's ids", async () => {
    requestRaw.mockRejectedValue(conflict());
    const r = await streamPdfClean({ docId: DOC, force: false });
    expect(r.inProgress).toEqual({ requestId: LIVE, executionId: "exec-1" });
  });

  it("still throws every other error", async () => {
    requestRaw.mockRejectedValue(
      new BackendApiError({ code: "internal_error", detail: "x", userMessage: "x", status: 500 }),
    );
    await expect(streamPdfClean({ docId: DOC, force: false })).rejects.toThrow();
  });

  it("joins the live run once: no error, no retry, one reload", async () => {
    requestRaw.mockRejectedValue(conflict());
    const follow = jest.fn(async (_t: unknown, o: any) => {
      await o.reloadSavedResult({ status: "completed", operation: null });
      return { status: "completed", settled: true };
    });
    const reload = jest.fn(async () => ({ id: DOC }));
    const out = await cleanDocument({
      docId: DOC,
      force: false,
      transport: () => ({}) as never,
      reload,
      follow: follow as never,
    });
    expect(out.kind).toBe("joined");
    expect(requestRaw).toHaveBeenCalledTimes(1);
    expect(follow).toHaveBeenCalledTimes(1);
    expect((follow.mock.calls[0][1] as any).target).toEqual({ requestId: LIVE });
    expect(reload).toHaveBeenCalledTimes(1);
    if (out.kind === "joined") expect(out.resolution.kind).toBe("completed");
  });
});

describe("already cleaned", () => {
  it("reads the existing text from the short stream with a single request", async () => {
    requestRaw.mockResolvedValue(
      ndjson([
        { event: "data", data: { clean_content: "Existing clean text" } },
        {
          event: "record_update",
          data: {
            table: "processed_documents",
            record_id: DOC,
            status: "completed",
            metadata: { already_cleaned: true },
          },
        },
        { event: "end", data: {} },
      ]),
    );
    const follow = jest.fn();
    const out = await cleanDocument({
      docId: DOC,
      force: false,
      transport: () => ({}) as never,
      reload: async () => null,
      follow: follow as never,
    });
    expect(out.kind).toBe("streamed");
    if (out.kind === "streamed") {
      expect(out.result.alreadyCleaned).toBe(true);
      expect(out.result.cleanContent).toBe("Existing clean text");
    }
    expect(requestRaw).toHaveBeenCalledTimes(1);
    expect(follow).not.toHaveBeenCalled();
  });
});

describe("two openers of the same uncleaned doc", () => {
  it("one request wins, the other gets the 409 and joins; each fires once", async () => {
    requestRaw
      .mockImplementationOnce(async () => ndjson([{ event: "end", data: {} }]))
      .mockRejectedValueOnce(conflict());
    const follow = jest.fn(async (_t: unknown, o: any) => {
      await o.reloadSavedResult({ status: "completed", operation: null });
      return { status: "completed", settled: true };
    });
    const mk = () =>
      cleanDocument({
        docId: DOC,
        force: false,
        transport: () => ({}) as never,
        reload: async () => ({ id: DOC }),
        follow: follow as never,
      });
    const [a, b] = await Promise.all([mk(), mk()]);
    expect(requestRaw).toHaveBeenCalledTimes(2);
    expect([a.kind, b.kind].sort()).toEqual(["joined", "streamed"]);
    expect(follow).toHaveBeenCalledTimes(1);
  });
});
