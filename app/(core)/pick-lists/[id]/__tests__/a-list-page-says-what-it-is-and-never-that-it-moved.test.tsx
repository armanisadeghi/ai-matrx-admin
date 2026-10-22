// app/(core)/pick-lists/[id]/__tests__/a-list-page-says-what-it-is-and-never-that-it-moved.test.tsx
//
// THE USE CASE (lane HANDOVER, 2026-09-27; page-pass 2026-10-22). The owner of Cedar Ridge Physical
// Therapy presses New picklist and lands on /pick-lists/<id>. The header names the list and Back leads
// to the Pick lists page; the page never says the list moved; and the page's agents see the same list
// the person sees (the `matrx-user/pick-lists` surface is mounted with the list's own values).
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIST_ID = "3cae19b9-09d0-473f-896c-c151fe3fb498";
const scopes: Array<() => Record<string, unknown>> = [];

jest.mock("@/features/unified-data/table-page/UnifiedDataTablePage", () => ({ UnifiedDataTablePage: () => null }));
jest.mock("@/features/data-tables/pick-lists/components/PickListChoicesEditor", () => ({
  PickListChoicesEditor: ({ choices }: { choices: { id: string; label: string }[] }) => (
    <ul>{choices.map((c) => <li key={c.id}>{c.label}</li>)}</ul>
  ),
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1" }));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({
  RecordPageHeader: ({ backHref, record }: { backHref: string; record: { name?: string } }) => (
    <a href={backHref} data-testid="header">
      {record.name}
    </a>
  ),
}));
jest.mock("@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext", () => ({
  SurfaceRuntimeProvider: ({
    surfaceName,
    getScope,
    children,
  }: {
    surfaceName: string;
    getScope: () => Record<string, unknown>;
    children: React.ReactNode;
  }) => {
    if (surfaceName === "matrx-user/pick-lists") scopes.push(getScope);
    return <>{children}</>;
  },
}));
jest.mock("@ai-matrx/context-menu/react", () => ({
  NonEditableContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/features/data-tables/pick-lists/service", () => ({
  getListWithItems: async () => ({
    list_id: "3cae19b9-09d0-473f-896c-c151fe3fb498",
    list_name: "Visit types",
    description: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: null,
    is_public: false,
    public_read: false,
    user_id: "user-1",
    items_grouped: { Ungrouped: [{ id: "c1", label: "New patient", description: null, help_text: null }] },
  }),
  addChoices: jest.fn(),
  archiveChoice: jest.fn(),
  updateChoice: jest.fn(),
  updateList: jest.fn(),
}));

// eslint-disable-next-line import/first
import { StoreListPage } from "../StoreListPage";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it("a list's page names the list, leads back to /pick-lists, and its agents see the same list", async () => {
  await act(async () => {
    root.render(<StoreListPage listId={LIST_ID} />);
  });
  const text = host.textContent ?? "";
  expect(text).not.toMatch(/now lives in the new system|switched its Data tables|moved/);
  expect(host.querySelector('[data-testid="header"]')?.textContent).toBe("Visit types");
  expect(host.querySelector('a[href="/pick-lists"]')).not.toBeNull();
  expect(text).toContain("New patient");
  const scope = scopes[scopes.length - 1]!();
  expect(scope.list_load_state).toBe("ready");
  expect(scope.active_list_name).toBe("Visit types");
  expect(scope.list_is_owner).toBe(true);
  expect(scope.all_items).toEqual([
    { id: "c1", label: "New patient", description: null, help_text: null, group: "Ungrouped" },
  ]);
  expect(String(scope.pick_list_bundle)).toContain('label="New patient"');
});
