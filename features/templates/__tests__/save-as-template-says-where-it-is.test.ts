/**
 * @jest-environment node
 */
// TEMPLATE-UI-POLISH (2026-10-20). A save is two store steps, the second only after the first answers. A save that stays long
// must say where it is (reading the tables, then saving the template), not show a spinner alone.
// RED on the prior bytes: saveAsTemplate took no stage callback, so nothing could be said.
import { saveAsTemplate, type SaveStage } from "../saveAsTemplate";

const draft = { spec: { catalogueId: "ORG-X", tables: [{ token: "people", name: "People", rows: [] }] }, missing: [], notes: [] };
jest.mock("@ai-matrx/records/core", () => ({
  storeDoors: () => ({
    templateFromTables: async () => ({ data: draft, error: null }),
    templateDeclare: async () => ({ data: { template_id: "tpl-1", catalogue_id: "ORG-X" }, error: null }),
  }),
}));
jest.mock("@ai-matrx/records/templates", () => ({ ...jest.requireActual("@ai-matrx/records/templates"), templateDeclaration: (spec: unknown) => spec }));

it("says reading, then saving, in order, and the save still answers", async () => {
  const stages: SaveStage[] = [];
  const result = await saveAsTemplate(
    {} as never,
    "org-1",
    { name: "People setup", describes: "", agents: [], tableIds: ["t1"], tableNames: { t1: "People" }, includeRows: true, rowsPerTable: 200 },
    (s) => stages.push(s),
  );
  expect(stages).toEqual(["reading", "saving"]);
  expect(result.templateId).toBe("tpl-1");
});
