/** A signed-out share link shows what people are typing now (the folded room), and never more than the token allows. */
import { liveShareChildren } from "../share-live";

const SAVED = { kind: "document_snapshot", snapshot: { body: { dataStream: "saved\r\n" } } };
const LIVE = { body: { dataStream: "saved and typed just now\r\n" } };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("liveShareChildren", () => {
  it("shows the folded room when it is ahead of the last save, and sends only the token and kind", async () => {
    const fetchImpl = jest.fn(async () => json(200, { source: "folded", snapshot: LIVE, head_rev: 9, checkpoint_rev: 0 }));
    const out = await liveShareChildren("tok-abcdefgh", "udt_document", SAVED, { baseUrl: "http://aidream.test/", fetchImpl: fetchImpl as never });
    expect(out).toEqual({ kind: "document_snapshot", snapshot: LIVE });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://aidream.test/collab/share/current");
    expect(JSON.parse(String(init.body))).toEqual({ token: "tok-abcdefgh", kind: "udt_document" });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("keeps the saved content when the link opens no live copy (404) or the room has nothing newer", async () => {
    for (const reply of [json(404, { detail: "no" }), json(200, { source: "checkpoint", snapshot: LIVE }), json(200, { source: "no_room" })]) {
      expect(await liveShareChildren("tok-abcdefgh", "udt_document", SAVED, { fetchImpl: (async () => reply) as never })).toBe(SAVED);
    }
  });

  it("says so when the server cannot be reached, keeping the saved content", async () => {
    const out = await liveShareChildren("tok-abcdefgh", "workbook", { kind: "workbook_snapshot", snapshot: { id: "w" } }, { fetchImpl: (async () => { throw new Error("down"); }) as never });
    expect(out).toMatchObject({ kind: "workbook_snapshot", snapshot: { id: "w" } });
    expect((out as { notice?: string }).notice).toMatch(/last saved copy/);
  });

  it("says how many edits are missing when the fold could not run", async () => {
    const out = await liveShareChildren("tok-abcdefgh", "udt_document", SAVED, { fetchImpl: (async () => json(200, { source: "stale", snapshot: SAVED.snapshot, head_rev: 12, checkpoint_rev: 10 })) as never });
    expect((out as { notice?: string }).notice).toMatch(/2 newer edits/);
  });

  it("asks nothing for a type that has no room", async () => {
    const fetchImpl = jest.fn();
    const children = { kind: "conversation_messages" };
    expect(await liveShareChildren("tok-abcdefgh", "conversation", children, { fetchImpl: fetchImpl as never })).toBe(children);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
