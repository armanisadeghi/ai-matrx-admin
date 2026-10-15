// A row's first page (embed/row-page.ts): its Notes migrate into the page without loss, then the table's
// default template's blocks land with fresh ids and their "This page's row" views intact (row-pages PLAN §2, §5).
import { ensureRowPage, findRowPageId, freshBlockIds, presetsForEmptyColumns, readTemplateBody, rowPageSnapshot, type RowPageDb } from "../row-page";
import { THIS_ROW } from "../../data/this-row";
import type { SpaceBlock } from "@/lib/spaces-blocks/types";

const span = (text: string) => [{ text }];
const paymentsView = (id: string): SpaceBlock =>
  ({
    id,
    type: "database",
    text: [],
    props: { source: { kind: "table", tableId: "9d0c7a2e-2222-4c3e-9d6e-6a1f0f1a0002" }, inline: true, title: "Payments", linked: true, views: [{ id: "view-pay", name: "Payments made", layout: "grid", filters: { client: THIS_ROW } }] },
    children: [],
  }) as unknown as SpaceBlock;

const TEMPLATE = { v: 1 as const, blocks: [{ id: "t-heading", type: "heading_2", text: span("Payments"), props: {}, children: [] } as unknown as SpaceBlock, paymentsView("t-db")] };

describe("a row's first page", () => {
  it("keeps every word of the row's notes, then places the template's views bound to this row", () => {
    let n = 0;
    const page = rowPageSnapshot({
      recordId: "row-1",
      notes: "Prefers **email** over calls.\n\n- Front desk: Maya\n- Parking behind the clinic",
      template: TEMPLATE,
      makeId: () => `new-${++n}`,
    });
    const text = JSON.stringify(page.blocks);
    for (const words of ["Prefers ", "email", " over calls.", "Front desk: Maya", "Parking behind the clinic"]) expect(text).toContain(words);
    const db = page.blocks.find((b) => b.type === "database");
    expect(db).toBeDefined();
    expect((db!.props as { views: Array<{ filters: Record<string, string> }> }).views[0].filters.client).toBe(THIS_ROW);
    // The template's own blocks get new ids; the notes come first.
    expect(page.blocks.map((b) => b.id)).not.toContain("t-db");
    expect(page.blocks[page.blocks.length - 1].type).toBe("database");
  });

  it("a row with no notes and no template starts empty; no template, notes only", () => {
    expect(rowPageSnapshot({ recordId: "r", notes: "  ", template: null }).blocks).toEqual([]);
    expect(rowPageSnapshot({ recordId: "r", notes: "Hello", template: null }).blocks.length).toBeGreaterThan(0);
  });

  it("fresh ids reach nested blocks", () => {
    let n = 0;
    const out = freshBlockIds([{ id: "a", type: "toggle", text: [], props: {}, children: [{ id: "b", type: "paragraph", text: [], props: {}, children: [] }] } as unknown as SpaceBlock], () => `x${++n}`);
    expect(out[0].id).toBe("x1");
    expect(out[0].children?.[0].id).toBe("x2");
  });

  it("reads only a real template body", () => {
    expect(readTemplateBody({ v: 1, blocks: [] })).toEqual({ v: 1, blocks: [] });
    expect(readTemplateBody({ blocks: [] })).toBeNull();
    expect(readTemplateBody(null)).toBeNull();
  });
});

// A NEW row page from the default template also applies the template's preset values (gap 2, 2026-10-14).
describe("a new row page applies the template's preset values", () => {
  const fakeDb = (created: boolean, values: Record<string, unknown>): RowPageDb => ({
    schema: (name) => ({
      rpc: (async (fn: string) => {
        if (name === "custom" && fn === "row_template_default") return { data: [{ template_id: "t", name: "Client", values, body: { v: 1, blocks: [] } }], error: null };
        if (name === "content" && fn === "row_page_ensure") return { data: [{ space_id: "space-1", created }], error: null };
        return { data: null, error: { message: `unexpected ${name}.${fn}` } };
      }) as never,
    }),
  });
  const base = { organizationId: "o", tableId: "t", recordId: "r", title: "Copperline", notes: null };

  it("fills only the columns the row left empty", () => {
    expect(presetsForEmptyColumns({ status: "", tier: "Gold", tags: [] }, { status: "Active", tier: "Silver", tags: ["new"], note: null })).toEqual({ status: "Active", tags: ["new"] });
  });

  it("writes the presets once, when the page is made now", async () => {
    const applied: Array<Record<string, unknown>> = [];
    const out = await ensureRowPage(fakeDb(true, { status: "Active", tier: "Silver" }), { ...base, document: { tier: "Gold" }, applyValues: async (p) => void applied.push(p) });
    expect(out).toEqual({ spaceId: "space-1", created: true });
    expect(applied).toEqual([{ status: "Active" }]);
  });

  it("never writes them when the row already had a page (someone else made it first)", async () => {
    const applied: Array<Record<string, unknown>> = [];
    await ensureRowPage(fakeDb(false, { status: "Active" }), { ...base, document: {}, applyValues: async (p) => void applied.push(p) });
    expect(applied).toEqual([]);
  });
});

describe("findRowPageId: the row's page through the read door (a reader of the row may resolve it)", () => {
  const dbAnswering = (answer: { data: unknown; error: { message: string } | null }) => {
    const calls: Array<{ schema: string; fn: string; args: Record<string, unknown> }> = [];
    const db = {
      schema: (schema: "custom" | "content") => ({
        rpc: async (fn: string, args: Record<string, unknown>) => {
          calls.push({ schema, fn, args });
          return answer as never;
        },
      }),
    };
    return { db, calls };
  };

  it("asks content.row_page_for with the row id, never the hidden association", async () => {
    const { db, calls } = dbAnswering({ data: "page-1", error: null });
    await expect(findRowPageId(db, "row-1")).resolves.toBe("page-1");
    expect(calls).toEqual([{ schema: "content", fn: "row_page_for", args: { p_record_id: "row-1" } }]);
  });

  it("is null when the door says no page or no access", async () => {
    await expect(findRowPageId(dbAnswering({ data: null, error: null }).db, "row-1")).resolves.toBeNull();
  });

  it("says why when the door fails", async () => {
    await expect(findRowPageId(dbAnswering({ data: null, error: { message: "boom" } }).db, "row-1")).rejects.toThrow("boom");
  });
});
