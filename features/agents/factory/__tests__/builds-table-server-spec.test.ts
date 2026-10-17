/**
 * The builds table's Door / Who / Job / Outcome filters, sorts and search are answered by the
 * database from the keys aidream stamps on the build's root row (`metadata.build_*`).
 */
import { FACTORY_BUILD_TABLE_SPEC } from "../service";
import { applyServerTableState } from "@/features/admin/shared/server-table/postgrest";
import { serverTableInitialState } from "@/features/admin/shared/server-table/useServerTable";

function record() {
  const calls: Array<[string, ...unknown[]]> = [];
  const q: Record<string, unknown> = {};
  for (const m of ["or", "eq", "in", "not", "ilike", "gte", "lte", "order", "range"]) {
    q[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return { q, calls };
}

describe("agent factory builds table server spec", () => {
  it("filters Door and Outcome by the stamped keys", () => {
    const { q, calls } = record();
    const state = {
      ...serverTableInitialState({ id: "started", direction: "desc" }, 50),
      columnFilters: {
        door: { kind: "select", values: ["generate"] },
        outcome: { kind: "select", values: ["passed", "failed"] },
        who: { kind: "text", value: "admin@" },
        mandate: { kind: "text", value: "support" },
      },
    };
    applyServerTableState(q, state as never, FACTORY_BUILD_TABLE_SPEC);
    expect(calls).toContainEqual(["in", "metadata->>build_place", ["generate"]]);
    expect(calls).toContainEqual(["in", "metadata->>build_outcome", ["passed", "failed"]]);
    expect(calls).toContainEqual(["ilike", "metadata->>build_who", "%admin@%"]);
    expect(calls).toContainEqual(["ilike", "metadata->>build_mandate_key", "%support%"]);
  });

  it("sorts by each stamped column and searches who, job, agent and door", () => {
    for (const [id, col] of [
      ["who", "metadata->>build_who"],
      ["door", "metadata->>build_place"],
      ["mandate", "metadata->>build_mandate_key"],
      ["outcome", "metadata->>build_outcome"],
    ] as const) {
      const { q, calls } = record();
      const state = { ...serverTableInitialState({ id, direction: "asc" }, 50), search: "irvine" };
      applyServerTableState(q, state as never, FACTORY_BUILD_TABLE_SPEC);
      expect(calls).toContainEqual(["order", col, { ascending: true }]);
      const or = calls.find((c) => c[0] === "or")?.[1] as string;
      for (const key of ["build_who", "build_mandate_key", "build_agent_name", "build_place"]) {
        expect(or).toContain(`metadata->>${key}.ilike.%irvine%`);
      }
    }
  });
});
