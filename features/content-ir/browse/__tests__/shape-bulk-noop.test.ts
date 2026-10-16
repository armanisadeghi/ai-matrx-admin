/**
 * B5 (2026-10-15): the shapes bulk bar offered "Activate" when every selected
 * shape was already active — a click that could only do nothing. The verb now
 * says why it is unavailable instead.
 */
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { shapeListConfig as shapeBrowseConfig } from "@/features/content-ir/browse/listConfig";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";

type Row = { id: string; is_active: boolean };

function selection(rows: Row[], count = rows.length): EntityBulkSelection<never> {
  return { mode: "ids", ids: rows.map((r) => r.id), rows: rows as never[], count, filter: {} as never };
}

const verb = (id: string) => {
  const actions = (shapeBrowseConfig as { bulkActions?: Array<{ id: string; disabledReason?: (c: number, s: EntityBulkSelection<never>) => string | null }> }).bulkActions ?? [];
  const found = actions.find((a) => a.id === id);
  if (!found?.disabledReason) throw new Error(`no disabledReason on ${id}`);
  return found.disabledReason;
};

describe("shape bulk verbs never offer a no-op", () => {
  it("Activate is unavailable, with a reason, when every selected shape is already active", () => {
    const all = selection([{ id: "a", is_active: true }, { id: "b", is_active: true }]);
    expect(verb("activate")(2, all)).toMatch(/already active/);
    const mixed = selection([{ id: "a", is_active: true }, { id: "b", is_active: false }]);
    expect(verb("activate")(2, mixed)).toBeNull();
  });
  it("Deactivate is unavailable when every selected shape is already inactive", () => {
    const all = selection([{ id: "a", is_active: false }]);
    expect(verb("deactivate")(1, all)).toMatch(/already inactive/);
  });
  it("never judges rows the list does not hold", () => {
    const partial = selection([{ id: "a", is_active: true }], 3);
    expect(verb("activate")(3, partial)).toBeNull();
  });
});
