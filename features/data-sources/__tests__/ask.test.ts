import { parseAskReading } from "../ask";

describe("parseAskReading", () => {
  it("maps the server's snake_case reading to the typed contract", () => {
    const r = parseAskReading({
      text: "3-bed homes under $600k in Austin", task: "homes", card_id: "homes-for-sale", confidence: "clear",
      subject: "", place: "Austin", near_me: false,
      filters: { beds_min: 3, beds_exact: true, price_max: 600000, home_type: null },
      alternatives: [], chips: [{ key: "price_max", label: "Under $600k" }], summary: "Homes · Austin",
    });
    expect(r.task).toBe("homes");
    expect(r.cardId).toBe("homes-for-sale");
    expect(r.filters.bedsMin).toBe(3);
    expect(r.filters.priceMax).toBe(600000);
    expect(r.filters.homeType).toBeNull();
    expect(r.chips[0]).toEqual({ key: "price_max", label: "Under $600k" });
  });

  it("is honest about garbage: unknown task, unclear", () => {
    const r = parseAskReading(null);
    expect(r.task).toBe("unknown");
    expect(r.confidence).toBe("unclear");
  });
});
