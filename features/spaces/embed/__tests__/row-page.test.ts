// A row's first page (embed/row-page.ts): its Notes migrate into the page without loss, then the table's
// default template's blocks land with fresh ids and their "This page's row" views intact (row-pages PLAN §2, §5).
import { freshBlockIds, readTemplateBody, rowPageSnapshot } from "../row-page";
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
