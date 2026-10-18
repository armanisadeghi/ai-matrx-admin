import { PHONE_TABLE_PX, runColumnWidths } from "../column-widths";

describe("runColumnWidths", () => {
  it("keeps Open on a 390 px phone: the phone set plus the select box fits the container", () => {
    const w = runColumnWidths(true);
    const total = w.when + w.status + w.cost + w.open;
    expect(total + 40).toBeLessThan(390 - 16);
    expect(w.open).toBeGreaterThanOrEqual(64);
  });
  it("leaves desktop widths alone", () => {
    expect(runColumnWidths(false)).toEqual({ when: 118, status: 92, cost: 112, open: 84 });
    expect(PHONE_TABLE_PX).toBeGreaterThan(390);
  });
});
