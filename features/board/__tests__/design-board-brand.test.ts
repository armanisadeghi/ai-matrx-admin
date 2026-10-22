import { designBrandFromEdges } from "../design-brand/design-board-brand";

const edge = (o: Partial<{ direction: string; otherType: string; otherId: string; role: string | null }>) => ({ direction: "outgoing", otherType: "web_brand", otherId: "b1", role: "design_system", ...o });

describe("designBrandFromEdges", () => {
  it("finds the design_system edge to a brand", () => {
    expect(designBrandFromEdges([edge({ otherType: "document", otherId: "d" }), edge({})])).toBe("b1");
  });
  it("is null with no such edge", () => {
    expect(designBrandFromEdges([edge({ role: "studio" }), edge({ direction: "incoming" })])).toBeNull();
    expect(designBrandFromEdges([])).toBeNull();
  });
});
