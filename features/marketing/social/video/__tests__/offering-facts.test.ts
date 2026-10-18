import { offeringPriceText } from "../offering-price";

describe("offeringPriceText", () => {
  it("reads the stored amount the way the label shows it", () => {
    expect(offeringPriceText({ price_amount: "189.00", price_currency: "USD" })).toBe("$189");
    expect(offeringPriceText({ price_amount: 55.5, price_currency: "USD", price_unit: "belt" })).toBe("$55.50 per belt");
    expect(offeringPriceText({ price_amount: 12, price_currency: "EUR" })).toBe("EUR 12");
  });
  it("is empty when the brand stored no amount", () => {
    expect(offeringPriceText({ price_amount: null })).toBe("");
    expect(offeringPriceText(null)).toBe("");
  });
});
