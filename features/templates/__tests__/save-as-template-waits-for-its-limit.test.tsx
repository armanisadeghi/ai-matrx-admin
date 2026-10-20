/**
 * @jest-environment jsdom
 */
// LANE BASES-MEMBER (2026-10-20). SAVE AS TEMPLATE IS OFF, WITH ITS REASON, UNTIL THE ROW LIMIT IS READ.
//
// THE USE CASE. A member opens "Save as template" on a base, types who it is for and presses Save the moment it lights up.
// The workspace is known before its row limit has been read, so Save was ON while the limit was still loading, and the press
// ended in a refusal in the knob's own words ("A limit is not set: templates.seed_row_cap"). A button must never be enabled
// and then refuse: while the limit is read, Save is off and says so; when the workspace truly has none, Save is off and says
// that in a plain sentence; once read, Save works.
//
// SUT: the real SaveTemplateDialog in jsdom. Replaced: the table list, the knob read (its answer is the test's variable), the
// store door and the agent dropdown (a package island).
// BREAKS THIS CATCHES (RED on the old dialog): Save enabled while the limit loads · a press that ends in the knob's key as the answer.

import { act } from "react";
import { createRoot } from "react-dom/client";

const saved: Array<Record<string, unknown>> = [];
let knobAnswer: { seedRowCap: number | null; missing: string[]; loading: boolean } = { seedRowCap: null, missing: [], loading: true };
jest.mock("@/features/unified-data/hub/useTablesEverywhere", () => ({
  useTablesEverywhere: () => ({
    loading: false,
    error: null,
    reload: () => undefined,
    rows: [{ table_id: "t-people", table_name: "People", organization_id: "org-1", organization_name: "Ridgeback" }],
  }),
}));
jest.mock("@/features/templates/knobs", () => ({ useScopedTemplateKnobs: () => knobAnswer }));
jest.mock("@/features/templates/saveAsTemplate", () => ({
  ...jest.requireActual("@/features/templates/saveAsTemplate"),
  saveAsTemplate: async (_client: unknown, _org: string, choices: Record<string, unknown>) => {
    saved.push(choices);
    return { templateId: "tpl-1", catalogueId: "ORG-1", left: [] };
  },
}));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@ai-matrx/agents/catalog/react", () => ({ AgentListDropdown: () => <div /> }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/official/ProTextarea", () => ({ ProTextarea: (p: { value: string; onChange: (e: unknown) => void }) => <textarea value={p.value} onChange={p.onChange as never} /> }));

import { SaveTemplateDialog } from "../components/SaveTemplateDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const open = async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<SaveTemplateDialog isOpen onClose={() => undefined} initialTableIds={["t-people"]} initialName="Ridgeback offices" />));
  const dialog = document.querySelector("[data-save-template]") as HTMLElement;
  return { root, dialog, save: dialog.querySelector("[data-save-template-save]") as HTMLButtonElement };
};

it("Save is off and says the limit is being read while it loads", async () => {
  knobAnswer = { seedRowCap: null, missing: [], loading: true };
  const { root, dialog, save } = await open();
  expect(save.disabled).toBe(true);
  expect(dialog.querySelector("[data-save-template-reason]")?.textContent).toBe("Reading this workspace's limits");
  await act(async () => save.click());
  expect(saved).toHaveLength(0);
  expect(dialog.textContent).not.toContain("seed_row_cap");
  await act(async () => root.unmount());
});

it("Save is off with a plain sentence when the workspace has no limit, never a knob key", async () => {
  knobAnswer = { seedRowCap: null, missing: ["templates.seed_row_cap"], loading: false };
  const { root, dialog, save } = await open();
  expect(save.disabled).toBe(true);
  expect(dialog.querySelector("[data-save-template-reason]")?.textContent).toBe("This workspace has no row limit set");
  expect(dialog.textContent).not.toContain("seed_row_cap");
  await act(async () => root.unmount());
});

it("Save works once the limit is read", async () => {
  knobAnswer = { seedRowCap: 25, missing: [], loading: false };
  const { root, dialog, save } = await open();
  expect(save.disabled).toBe(false);
  expect(dialog.querySelector("[data-save-template-reason]")).toBeNull();
  await act(async () => save.click());
  expect(saved).toHaveLength(1);
  await act(async () => root.unmount());
});
