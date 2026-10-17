// DRILL-ROUND2 #1-#3. Red before: "See these records" read only the definition-wide columns, a drilled
// person still showed "People 1", and the describe door was asked twice for one source.
import type { DrillDefinition } from "@ai-matrx/records";
import type { RecordsClient } from "@ai-matrx/records/core";

import { describeOnce, shareIdenticalAsks } from "../describeOnce";
import { hidePinnedDistinct, recordsForTrail } from "../drillPinned";

const def = {
  key: "workflow_runs",
  dimensions: [
    { key: "workflow", label: "Workflow", from: "workflow_id", kind: "relation", level: { records: ["created_at", "run_id", "status"] } },
    { key: "person", label: "Person", from: "person_id", kind: "relation" },
  ],
  measures: [
    { key: "runs", label: "Runs", op: "count", unit: "count" },
    { key: "people", label: "People", op: "count_distinct", of: "person_id", unit: "count" },
    { key: "workflows", label: "Workflows", op: "count_distinct", of: "workflow_id", unit: "count" },
  ],
} as unknown as DrillDefinition;
const records = { fact: "workflow_run_facts", columns: ["created_at", "run_id", "workflow_id", "status", "person_id"] };

describe("records at the end of a trail", () => {
  it("read the last pinned Dimension's own level.records", () => {
    expect(recordsForTrail(def, records, { where: [{ dim: "workflow", value: "w1" }] }).columns).toEqual(["created_at", "run_id", "status"]);
  });
  it("keep the definition's columns with no trail, or a level that declares none", () => {
    expect(recordsForTrail(def, records, { where: [] })).toBe(records);
    expect(recordsForTrail(def, records, { where: [{ dim: "person", value: "p1" }] })).toBe(records);
  });
});

describe("a distinct count of a pinned Dimension", () => {
  it("is dropped inside the drilled value, whichever definition", () => {
    const q = { by: ["status"], show: ["runs", "people", "workflows"], where: [{ dim: "person", value: "p1" }] };
    expect(hidePinnedDistinct(def, q).show).toEqual(["runs", "workflows"]);
  });
  it("stays outside a drill, and never empties the list", () => {
    const open = { by: ["status"], show: ["runs", "people"], where: [] };
    expect(hidePinnedDistinct(def, open)).toBe(open);
    const only = { by: ["status"], show: ["people"], where: [{ dim: "person", value: "p1" }] };
    expect(hidePinnedDistinct(def, only).show).toEqual(["people"]);
  });
});

describe("describeOnce", () => {
  it("asks the door once for one client and source", async () => {
    const drillDescribe = jest.fn(async () => ({ ok: true, data: def }));
    const client = { drillDescribe } as unknown as RecordsClient;
    await Promise.all([describeOnce(client, { kind: "entity", token: "x" }), describeOnce(client, { kind: "entity", token: "x" })]);
    expect(drillDescribe).toHaveBeenCalledTimes(1);
  });
});

describe("shareIdenticalAsks", () => {
  it("one call for the same question asked twice at once, a fresh call once it has answered", async () => {
    const drillAsk = jest.fn(async () => ({ ok: true, data: { rows: [] } }));
    const client = shareIdenticalAsks({ drillAsk } as unknown as RecordsClient);
    const q = { source: { kind: "entity", token: "x" }, question: { by: ["person"], show: ["runs"], where: {} } } as never;
    await Promise.all([client.drillAsk(q), client.drillAsk(q)]);
    expect(drillAsk).toHaveBeenCalledTimes(1);
    await client.drillAsk(q);
    expect(drillAsk).toHaveBeenCalledTimes(2);
  });
});
