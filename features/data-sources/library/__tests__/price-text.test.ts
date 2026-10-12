let sees = false;
jest.mock("@/components/cost/useCostDisplay", () => ({
  useCostDisplay: () => ({ rate: 20000 }),
  useSeesDollars: () => sees,
}));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({ useOrganizationRequired: () => ({ organizationId: "o" }) }));
jest.mock("./../server", () => ({ getLibrary: jest.fn() }));

import { usePriceText } from "../hooks";

const source = { pointsPerRecord: 150, usd_per_record: 0.0075 };

describe("usePriceText: one rule for every data-source quote", () => {
  it("a member reads points only, never a dollar sign", () => {
    sees = false;
    const price = usePriceText();
    const text = price(source, 1);
    expect(text).toBe("150 points");
    expect(text).not.toContain("$");
  });

  it("a dollar seat reads cents with the points beside", () => {
    sees = true;
    const price = usePriceText();
    expect(price(source, 1)).toBe("$0.01 · 150 points");
    expect(price(source, 100)).toBe("$0.75 · 15,000 points");
  });
});
