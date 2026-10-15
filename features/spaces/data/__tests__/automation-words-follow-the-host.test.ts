// A table's automations say records and fields (the canonical words); Spaces keeps pages and properties.
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => ({}) }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/controls", () => ({ Button: () => null, Input: () => null, Switch: () => null }));

import { describeSpec, spacesSay, tableSay } from "../Automations";

const spec = {
  name: "n",
  trigger: { on: "row_added" as const },
  actions: [{ do: "add_row" as const, table_id: "t" as never, values: {} }, { do: "edit_rows" as const, table_id: "t" as never, where: { op: "eq", args: [] } as never, values: {} }],
};

describe("automation words", () => {
  it("a table says record, Spaces says page", () => {
    expect(describeSpec(spec, [], tableSay)).toBe("Record added → add record, edit records");
    expect(describeSpec(spec, [], spacesSay)).toBe("Page added → add page, edit pages");
  });
  it("never rewrites a person's own field name", () => {
    const f = [{ id: "a", label: "Page count" }] as never;
    expect(describeSpec({ ...spec, trigger: { on: "property_edited", field: "a" } as never }, f, tableSay)).toContain("Page count edited");
  });
});
