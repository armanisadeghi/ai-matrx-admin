/**
 * The tiered breadcrumb's Spaces tiers: a page's databases (tier 2, nested ones too) and each one's
 * views (tier 3), addressed so the page opens at that block with that view showing — and the
 * database block reading that view back off the address.
 */
import type { SpaceBlock } from "@/features/spaces/contract";
import { databasesOfPage } from "../page-databases";
import { urlViewFor } from "../../data/url-view";

const db = (id: string, title: string | undefined, views?: Array<{ id: string; name: string; layout: string }>): SpaceBlock =>
  ({ id, type: "database", text: [], props: { source: { kind: "table", tableId: `t-${id}` }, inline: true, title, linked: true, views, activeViewId: views?.[0]?.id }, children: [] }) as unknown as SpaceBlock;

describe("a page's databases and their views", () => {
  const blocks: SpaceBlock[] = [
    { id: "h", type: "heading", text: [{ text: "Quick Links" }], props: { level: 2 }, children: [] } as unknown as SpaceBlock,
    db("pay", "View of Payments", [
      { id: "made", name: "Payments made", layout: "grid" },
      { id: "all", name: "All payments", layout: "grid" },
    ]),
    // Inside a toggle: still on the page.
    { id: "tg", type: "toggle", text: [{ text: "More" }], props: {}, children: [db("meet", "Client Meetings", [{ id: "up", name: "Upcoming", layout: "calendar" }])] } as unknown as SpaceBlock,
    db("bare", undefined),
  ];

  it("lists every database, nested ones too, each opening at its block", () => {
    const items = databasesOfPage("north", blocks);
    expect(items.map((i) => [i.label, i.href])).toEqual([
      ["View of Payments", "/spaces/north#block-pay"],
      ["Client Meetings", "/spaces/north#block-meet"],
      ["Database", "/spaces/north#block-bare"],
    ]);
  });

  it("gives each database its views, each opening its block with that view", () => {
    const [pay, , bare] = databasesOfPage("north", blocks);
    expect(pay.children?.map((v) => [v.label, v.href])).toEqual([
      ["Payments made", "/spaces/north?view=made#block-pay"],
      ["All payments", "/spaces/north?view=all#block-pay"],
    ]);
    // A database with no saved views shows the one it draws ("All").
    expect(bare.children?.map((v) => v.label)).toEqual(["All"]);
    expect(pay.children?.every((v) => v.expandable === false)).toBe(true);
  });

  it("the block reads its view back off that address, and only its own", () => {
    const href = new URL("http://x/spaces/north?view=all#block-pay");
    expect(urlViewFor("pay", href)).toBe("all");
    expect(urlViewFor("meet", href)).toBeNull();
    expect(urlViewFor("pay", new URL("http://x/spaces/north#block-pay"))).toBeNull();
  });
});
