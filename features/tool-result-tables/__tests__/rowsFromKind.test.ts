import { asGrid, describeRows } from "../rowsFromKind";

const reviewsSchema = {
  type: "object",
  properties: {
    __kind: { type: "string" },
    items: { type: "array", items: { $ref: "#/$defs/Review" } },
  },
  $defs: {
    Review: {
      type: "object",
      properties: {
        url: { type: "string", title: "Review link", "x-row-key": true },
        rating: { type: "number", title: "Stars" },
        text: { type: "string", title: "Review" },
        meta: { type: "object" },
      },
    },
  },
};

describe("a Tool answer read as table rows", () => {
  it("takes the kind's titles as column headers and the marked field as the key", () => {
    const d = describeRows(
      { __kind: "customer_reviews", items: [{ url: "https://a/1", rating: 5, text: "Great", meta: { x: 1 } }, { url: "https://a/2", rating: 2, text: null }] },
      reviewsSchema,
    )!;
    expect(d.rowsKey).toBe("items");
    expect(d.headers).toEqual(["Review link", "Stars", "Review"]);
    expect(d.keyHeader).toBe("Review link");
    expect(d.rows).toHaveLength(2);
    expect(asGrid(d).rows[1]).toEqual(["https://a/2", "2", ""]);
  });

  it("collapses a repeated key to one row so a re-run cannot duplicate", () => {
    const d = describeRows({ items: [{ url: "u", n: 1 }, { url: "u", n: 2 }, { url: "v", n: 3 }] })!;
    expect(d.keyHeader).toBe("Url");
    expect(d.rows.map((r) => r.Url)).toEqual(["u", "v"]);
  });

  it("makes a composite key when several fields are marked", () => {
    const schema = { properties: { items: { type: "array", items: { type: "object", properties: { a: { type: "string", "x-row-key": true }, b: { type: "string", "x-row-key": true } } } } } };
    const d = describeRows({ items: [{ a: "x", b: "1" }, { a: "x", b: "2" }] }, schema)!;
    expect(d.keyHeader).toBe("Key");
    expect(d.rows.map((r) => r.Key)).toEqual(["x | 1", "x | 2"]);
  });

  it("uses a field named row_key as the key", () => {
    const d = describeRows({ items: [{ url: "u1", row_key: "tiktok:1", n: 1 }, { url: "u1", row_key: "tiktok:2", n: 2 }] })!;
    expect(d.keyHeader).toBe("Row key");
    expect(d.rows).toHaveLength(2);
  });

  it("reads a single-record answer as one row and skips the kind marker", () => {
    const d = describeRows({ __kind: "domain_authority", domain: "a.com", domain_authority: 57, nested: { a: 1 } })!;
    expect(d.rowsKey).toBeNull();
    expect(d.headers).toEqual(["Domain", "Domain authority"]);
    expect(d.keyHeader).toBe("Domain");
    expect(d.rows).toHaveLength(1);
  });

  it("is null when there is nothing to keep", () => {
    expect(describeRows({ items: [] })).toBeNull();
    expect(describeRows("text")).toBeNull();
  });
});
