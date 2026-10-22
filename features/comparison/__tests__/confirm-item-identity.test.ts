/**
 * "Is this them?" names the right company (overnight review 2026-10-22, I9): a result saved before items
 * carried their request position must never answer for item 0 — it names the item by its id instead.
 */
jest.mock("@/lib/python-client", () => ({ getJson: jest.fn(), postJson: jest.fn(), requestRaw: jest.fn() }));
jest.mock("@ai-matrx/api", () => ({ parseMatrxNdjsonResponse: jest.fn() }));

import { parseResult } from "../contract";
import { confirmPath } from "../server";

const result = (item: Record<string, unknown>) => parseResult({
  kind: "companies_reviews", kind_label: "Companies", primary_field: "rating", fields: [],
  items: [{ item_id: "https://www.trustpilot.com/review/beta.com", name: "Beta", rank: 1, values: {}, facets: [], ...item }],
});

describe("the confirm address", () => {
  it("an older result without a position is named by id, never position 0", () => {
    const item = result({})!.items[0];
    expect(item.item_index).toBeUndefined();
    const path = confirmPath("r1", item, "jobs");
    expect(path).toContain("/items/by-id/facets/jobs/confirm?item_id=");
    expect(path).not.toContain("/items/0/");
    expect(decodeURIComponent(path.split("item_id=")[1])).toBe("https://www.trustpilot.com/review/beta.com");
  });

  it("a result with a position sends it, with the id for the server to check", () => {
    const path = confirmPath("r1", result({ item_index: 1 })!.items[0], "linkedin");
    expect(path).toMatch(/\/items\/1\/facets\/linkedin\/confirm\?item_id=https%3A%2F%2Fwww\.trustpilot\.com/);
  });
});
