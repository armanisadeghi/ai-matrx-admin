
import { newField } from "./model";
import { placedBox, withPlacedBox } from "./fieldSizing";

const at = { document_key: "d", recipient_key: "r", page: 1, cx: 0.5, cy: 0.5 };

describe("a placed field starts at a box that holds what it holds", () => {
  it("a dropdown with a long option is wider than the default box and stays on the page", () => {
    const f = newField("dropdown", { ...at, cx: 0.95 }, []);
    const long = withPlacedBox({ ...f, options: ["Option 1", "A considerably longer second option"] });
    expect(long.w).toBeGreaterThan(f.w);
    expect(long.x + long.w).toBeLessThanOrEqual(1);
  });
  it("a short list keeps the default width", () => {
    expect(placedBox(newField("dropdown", at, [])).w).toBeCloseTo(0.24, 2);
  });
  it("a radio and a checkbox are squares in points, not the old oval", () => {
    for (const kind of ["radio", "checkbox"] as const) {
      const b = placedBox(newField(kind, at, []));
      expect(b.w * 612).toBeCloseTo(b.h * 792, 5);
      expect(b.w * 612).toBeGreaterThanOrEqual(18);
    }
  });
});
