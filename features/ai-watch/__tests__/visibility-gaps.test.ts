/**
 * Admin AI visibility, second pass (2026-10-17): the judge call is followable, the Everything feed
 * pages and merges honestly, Watch AI lives in one place, a kind key never prints, and the from-chat
 * door follows every sub-run it is told about.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { everythingRow, mergeEverything, type EverythingRow } from "../everything-feed";
import { watchAiCopyToClose } from "../watch-ai-one-place";

const src = (rel: string) => readFileSync(join(__dirname, "..", "..", "..", rel), "utf8");

describe("Everything feed", () => {
  it("labels a stored run by its mandate and reads who, door and cost", () => {
    const r = everythingRow({
      id: "u1", status: "completed", created_at: "2026-10-17T10:00:00Z", origin_class: "system", created_by: "p1", organization_id: "o1",
      agent_id: "a1", total_cost: "0.0012", source_feature: "patrol", metadata: { mandate_watch: { mandate_key: "patrol.sweep" }, agent_name: "Sweeper" },
    });
    expect(r).toMatchObject({ userRequestId: "u1", label: "patrol.sweep", originClass: "system", personId: "p1", organizationId: "o1", mandateKey: "patrol.sweep", totalCost: 0.0012 });
  });

  it("a refresh merges over older pages by id, newest first", () => {
    const row = (id: string, at: string, status: string): EverythingRow => ({ ...everythingRow({ id, created_at: at, status, metadata: {} }) });
    const merged = mergeEverything([row("a", "2026-10-17T10:00:00Z", "running"), row("b", "2026-10-17T09:00:00Z", "completed")], [row("a", "2026-10-17T10:00:00Z", "completed"), row("c", "2026-10-17T11:00:00Z", "running")]);
    expect(merged.map((r) => r.userRequestId)).toEqual(["c", "a", "b"]);
    expect(merged[1].status).toBe("completed");
  });

  it("reads chat.user_request server-side (filters and keyset paging), only when engaged", () => {
    const feed = src("features/ai-watch/everything-feed.ts");
    expect(feed).toMatch(/\.lt\("created_at", before\)/);
    expect(feed).toMatch(/\.limit\(pageSize\)/);
    expect(feed).toMatch(/\.eq\("created_by"/);
    const panel = src("features/ai-watch/useAiWatchPanel.tsx");
    expect(panel).toMatch(/mode === "everything" \? \(\s*<EverythingFeed/);
  });
});

describe("Watch AI in one place", () => {
  it("closes the copy that does not fit when both exist, and nothing otherwise", () => {
    expect(watchAiCopyToClose({ windowOpen: true, canvasOpen: false, room: true })).toBeNull();
    expect(watchAiCopyToClose({ windowOpen: false, canvasOpen: true, room: false })).toBeNull();
    expect(watchAiCopyToClose({ windowOpen: true, canvasOpen: true, room: true })).toBe("canvas");
    expect(watchAiCopyToClose({ windowOpen: true, canvasOpen: true, room: false })).toBe("window");
    expect(watchAiCopyToClose({ windowOpen: true, canvasOpen: true, room: null })).toBe("window");
  });
  it("AutoWatch enforces it", () => {
    expect(src("features/ai-watch/AutoWatch.tsx")).toMatch(/watchAiCopyToClose\(/);
  });
});

describe("a kind key never prints in Watch AI", () => {
  it("every recorded or forming scalar goes through RowText", () => {
    const panel = src("features/ai-watch/useAiWatchPanel.tsx");
    expect(panel).not.toMatch(/<dd[^>]*>\{r\.text\}<\/dd>/);
    expect((panel.match(/<RowText text=\{r\.text\} \/>/g) ?? []).length).toBe(2);
  });
});

describe("the from-chat door follows every sub-run it is told about", () => {
  it("follows the run conversation of each progress event", () => {
    expect(src("features/agents/from-chat/service.ts")).toMatch(/progressRunConversationId\(d\)[\s\S]{0,200}followServerWork\(\{ kind: "conversation"/);
  });
});
