// The render-blocks section reads and writes agent.prompt_block and keeps
// every field it showed (block id, template, skill link, active flag, public flag).
const calls: Array<[string, string]> = [];
const builder: Record<string, unknown> = {};
for (const m of ["select", "is", "order", "eq"]) builder[m] = jest.fn(() => builder);
builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: (s: string) => ({
      from: (t: string) => {
        calls.push([s, t]);
        return builder;
      },
    }),
  },
}));
jest.mock("@/utils/supabase/claimsUser", () => ({
  getClaimsUser: async () => ({ data: { user: { id: "c4a1e2d7-5b3f-4e88-9a6c-0d2f7b81e395" } } }),
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import { fetchRenderDefinitions } from "../redux/skl/thunks";
import {
  rowToSklRenderDefinition,
  sklRenderDefinitionToInsert,
  sklRenderDefinitionToUpdate,
} from "../redux/skl/converters";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "meeting-notes",
  label: "Meeting notes",
  description: "d",
  icon_name: "FileText",
  content: "# {{title}}",
  category_id: "22222222-2222-4222-8222-222222222222",
  skill_id: "33333333-3333-4333-8333-333333333333",
  block_type: "xml",
  deleted_at: null,
  published_to_web: true,
  sort_order: 3,
  created_by: null,
  organization_id: "44444444-4444-4444-8444-444444444444",
  created_at: "2026-10-11T00:00:00Z",
  updated_at: "2026-10-11T00:00:00Z",
};

it("reads the block table, not the retired render definition", async () => {
  calls.length = 0;
  const dispatch = jest.fn();
  await (fetchRenderDefinitions() as unknown as (d: unknown, g: unknown, e: unknown) => Promise<unknown>)(
    dispatch,
    () => ({}),
    undefined,
  );
  expect(calls).toContainEqual(["agent", "prompt_block"]);
  expect(calls.filter(([schema]) => schema === "skill")).toEqual([]);
});

it("maps every field the section shows", () => {
  const def = rowToSklRenderDefinition(row as never);
  expect(def).toMatchObject({
    blockId: "meeting-notes",
    template: "# {{title}}",
    skillId: row.skill_id,
    blockType: "xml",
    isActive: true,
    isPublic: true,
    sortOrder: 3,
  });
  expect(rowToSklRenderDefinition({ ...row, deleted_at: "2026-10-11T01:00:00Z" } as never).isActive).toBe(false);
});

it("writes name/content and the archive as the off switch", () => {
  const ins = sklRenderDefinitionToInsert({ blockId: "a-b", label: "L", iconName: "X", template: "T", skillId: "s" });
  expect(ins).toMatchObject({ name: "a-b", content: "T", skill_id: "s" });
  expect(ins).not.toHaveProperty("block_id");
  expect(sklRenderDefinitionToUpdate({ isActive: true })).toEqual({ deleted_at: null });
  expect(sklRenderDefinitionToUpdate({ isActive: false }).deleted_at).toEqual(expect.any(String));
});
