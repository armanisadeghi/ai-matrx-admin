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

  it("never gives two columns one header: a review's id and its text are both titled Review in the kind", () => {
    const schema = {
      type: "object",
      properties: { items: { type: "array", items: { $ref: "#/$defs/R" } } },
      $defs: {
        R: {
          type: "object",
          properties: {
            text: { type: "string", title: "Review" },
            review_id: { type: "string", title: "Review", "x-row-key": true },
            rating: { type: "number", title: "Stars" },
          },
        },
      },
    };
    const d = describeRows({ items: [{ text: "Fine", review_id: "14647844316", rating: 4 }] }, schema)!;
    expect(d.headers).toEqual(["Review", "Review ID", "Stars"]);
    expect(d.keyHeader).toBe("Review ID");
    expect(d.rows[0]).toEqual({ Review: "Fine", "Review ID": "14647844316", Stars: 4 });
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

import { rowsForColumns } from "../appendResultRows";

describe("rows written in the words the target column takes", () => {
  const described = { rowsKey: "items", headers: ["Decision maker", "Confidence"], keyHeader: "Decision maker", rows: [{ "Decision maker": true, Confidence: 85 }] };
  const field = (field_name: string, data_type: string, format?: string) =>
    ({ id: field_name, field_name, display_name: field_name, data_type, field_order: 0, is_required: false, metadata: format ? { format: { id: format } } : null }) as never;

  it("writes a boolean as words into a choice column whatever its data type", () => {
    const rows = rowsForColumns(described, { "Decision maker": "decision_maker", Confidence: "confidence" }, [field("decision_maker", "boolean", "choice"), field("confidence", "number")]);
    expect(rows[0]["Decision maker"]).toBe("true");
    expect(rows[0].Confidence).toBe(85);
  });

  it("keeps a real boolean for a boolean column", () => {
    const rows = rowsForColumns(described, { "Decision maker": "decision_maker" }, [field("decision_maker", "boolean")]);
    expect(rows[0]["Decision maker"]).toBe(true);
  });
});

describe("a kind says how its rows read as a table", () => {
  const schema = {
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            post_id: { type: "string", title: "Post id", "x-table-hide": true },
            views: { type: ["integer", "null"], title: "Views", "x-table-order": 3 },
            caption: { type: ["string", "null"], title: "Caption", "x-table-order": 1 },
            posted: { type: ["string", "null"], title: "Posted", "x-table-order": 2 },
            row_key: { type: ["string", "null"], title: "Row key", "x-row-key": true },
          },
        },
      },
    },
  };
  it("orders by x-table-order, leaves out x-table-hide, and keeps the row key last", () => {
    const d = describeRows({ items: [{ post_id: "p1", views: 9, caption: "Hi", posted: "May 2", row_key: "k1" }] }, schema)!;
    expect(d.headers).toEqual(["Caption", "Posted", "Views", "Row key"]);
    expect(d.keyHeader).toBe("Row key");
  });
});
