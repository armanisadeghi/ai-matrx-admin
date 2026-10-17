// K1 — "See these records" honours the question's sort. Red before: DrillRecords never sent a sort,
// so records of a question sorted by cost came back newest first.
import type { DrillDefinition } from "@ai-matrx/records";

import { recordsSortOf } from "../DrillRecords";

const def = {
  key: "ai_usage_executions",
  dimensions: [
    { key: "person", label: "Person", from: "person_id", kind: "relation" },
    { key: "at", label: "When", from: "created_at", kind: "time" },
  ],
  measures: [
    { key: "cost", label: "Cost", op: "sum", of: "cost", unit: "usd", additive: true },
    { key: "cost_per_request", label: "Per request", op: "ratio", num: ["cost"], den: "requests", unit: "usd" },
  ],
} as unknown as DrillDefinition;
const records = { columns: ["created_at", "person_id", "cost"] };

describe("recordsSortOf", () => {
  it("a Measure sorts the records by the column it sums, largest first", () => {
    expect(recordsSortOf(def, records, { key: "cost" })).toEqual({ key: "cost", direction: "desc" });
    expect(recordsSortOf(def, records, { key: "cost", direction: "asc" })).toEqual({ key: "cost", direction: "asc" });
  });
  it("a Dimension keeps its key (the door maps it) and reads ascending by default", () => {
    expect(recordsSortOf(def, records, { key: "person" })).toEqual({ key: "person", direction: "asc" });
  });
  it("a sort no records column can carry (a ratio) or no sort is null", () => {
    expect(recordsSortOf(def, records, { key: "cost_per_request" })).toBeNull();
    expect(recordsSortOf(def, records, undefined)).toBeNull();
  });
});
