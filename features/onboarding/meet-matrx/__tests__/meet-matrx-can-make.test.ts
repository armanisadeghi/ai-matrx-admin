/** @jest-environment node */
/**
 * Meet Matrx's "What your agents can make": the shapes chat offers, in Can make's order and colors, each a
 * pill that opens a new chat with that shape picked.
 */
import { canMakeGroup, canMakeHref, CAN_MAKE_LABEL } from "../MeetMatrxCanMake";

const shape = (kind: string, sort: number, color: string | null = "#2563EB") => ({ kind, short_label: kind, icon: "Table", color, sort_order: sort });

describe("What your agents can make", () => {
  it("is a chips group in Can make's order, each pill opening a new chat with that shape picked", () => {
    const g = canMakeGroup([shape("timeline", 4), shape("data_table", 1), shape("chart", 2)]);
    expect(g.label).toBe(CAN_MAKE_LABEL);
    expect(g.size).toBe("chips");
    expect(g.items.map((i) => i.href)).toEqual(["/chat/new?make=data_table", "/chat/new?make=chart", "/chat/new?make=timeline"]);
    expect(g.items[0]?.identity?.color).toBe("#2563EB");
    expect(typeof g.items[0]?.identity?.icon).not.toBe("undefined");
  });
  it("leaves out a shape with no valid color rather than drawing it wrong", () => {
    expect(canMakeGroup([shape("a_shape", 1, null), shape("b_shape", 2, "blue")]).items).toHaveLength(0);
  });
  it("encodes the kind in the link", () => {
    expect(canMakeHref("data_table")).toBe("/chat/new?make=data_table");
  });
});
