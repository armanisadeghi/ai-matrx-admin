/**
 * @jest-environment jsdom
 */
// LANE AT-FIX-H3 (2026-10-19). A BASE IS SAVED AS A TEMPLATE FROM ITS TABLES, WITH NO AGENT TO PICK.
//
// THE USE CASE. Priya has a base with a People table that carries a Map view and an Org chart view. She wants to keep it as a
// template her workspace can install. "Save as template" used to start from an AGENT ("Choose an agent...", Save off until
// one reads the tables), so a base with no agent could not be saved at all. Now the base page opens the dialog with the
// base's tables: no agent chooser, the tables listed, the name started from the base's, and Save writes a tables-only template.
//
// SUT: the real SaveTemplateDialog, rendered in jsdom. Replaced: the table list (useTablesEverywhere), the store doors
// (saveAsTemplate) and the agent dropdown (a package island), so the call the dialog makes is captured.
// BREAKS THIS CATCHES (each RED on the old dialog): the agent chooser still drawn · Save still disabled for want of an agent ·
// the tables not listed · the base's name not carried · a save that passes an agent or drops a table.

import { act } from "react";
import { createRoot } from "react-dom/client";

const saved: Array<Record<string, unknown>> = [];
jest.mock("@/features/unified-data/hub/useTablesEverywhere", () => ({
  useTablesEverywhere: () => ({
    loading: false,
    error: null,
    reload: () => undefined,
    rows: [
      { table_id: "t-people", table_name: "People", organization_id: "org-1", organization_name: "Ridgeback" },
      { table_id: "t-offices", table_name: "Offices", organization_id: "org-1", organization_name: "Ridgeback" },
    ],
  }),
}));
jest.mock("@/features/templates/knobs", () => ({ useScopedTemplateKnobs: () => ({ seedRowCap: 25, missing: [] }) }));
jest.mock("@/features/templates/saveAsTemplate", () => ({
  ...jest.requireActual("@/features/templates/saveAsTemplate"),
  saveAsTemplate: async (_client: unknown, _org: string, choices: Record<string, unknown>) => {
    saved.push(choices);
    return { templateId: "tpl-1", catalogueId: "ORG-1", left: [] };
  },
}));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@ai-matrx/agents/catalog/react", () => ({ AgentListDropdown: () => <div data-agent-chooser="" /> }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/official/ProTextarea", () => ({ ProTextarea: (p: { value: string; onChange: (e: unknown) => void }) => <textarea value={p.value} onChange={p.onChange as never} /> }));

import { SaveTemplateDialog } from "../components/SaveTemplateDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("a base's tables are saved as a template with no agent", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<SaveTemplateDialog isOpen onClose={() => undefined} initialTableIds={["t-people", "t-offices"]} initialName="Ridgeback offices" />));
  const dialog = document.querySelector("[data-save-template]") as HTMLElement;
  expect(dialog).not.toBeNull();
  expect(dialog.querySelector("[data-agent-chooser]")).toBeNull();
  expect(dialog.textContent).not.toContain("Choose an agent");
  expect(dialog.textContent).toContain("People");
  expect(dialog.textContent).toContain("Offices");
  expect((dialog.querySelector("[data-save-template-name]") as HTMLInputElement).value).toBe("Ridgeback offices");
  const save = dialog.querySelector("[data-save-template-save]") as HTMLButtonElement;
  expect(save.disabled).toBe(false);
  await act(async () => save.click());
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ name: "Ridgeback offices", agents: [], tableIds: ["t-people", "t-offices"], includeRows: true });
  expect(document.querySelector("[data-save-template-saved]")).not.toBeNull();
  await act(async () => root.unmount());
});
