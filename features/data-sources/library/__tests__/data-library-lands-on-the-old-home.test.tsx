/** @jest-environment jsdom */
//
// "Nothing should have ever changed for active things" (Arman). /data/library lands on the data
// library's own home; the Tools home is its own door (`?view=tools`) and the old page links to it.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let search = "";
jest.mock("next/navigation", () => ({
  usePathname: () => "/data/library",
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({
  pushAddressWithoutNavigating: jest.fn(),
  replaceAddressWithoutNavigating: jest.fn(),
}));
jest.mock("@ai-matrx/chat/agents/identity/tool-search", () => ({
  useOwnToolSearch: () => ({ status: "ready", known: {}, hits: [] }),
}));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({
  RecordPageHeader: ({ record, level }: { record?: { name: string }; level?: { name: string } }) => <h1 data-testid="title">{(record ?? level)?.name}</h1>,
}));
jest.mock("@/components/official/ProInput", () => ({ ProInput: (p: { "aria-label"?: string }) => <input aria-label={p["aria-label"]} /> }));
jest.mock("@/components/cost/useCostDisplay", () => ({ useCostDisplay: () => ({}) }));
jest.mock("../hooks", () => ({
  useLibraryOrganizationId: () => "org",
  useLibrary: () => ({ isLoading: false, error: null, data: { sources: [], sections: [], groups: [] }, refetch: jest.fn() }),
  usePriceText: () => () => "",
}));
jest.mock("../tasks", () => ({ LIBRARY_TASKS: [], resolveTask: () => null, resolveTasks: () => [] }));
jest.mock("../tools/ToolsHome", () => ({ ToolsHome: () => <div data-testid="tools-home" /> }));
jest.mock("../tools/ToolPage", () => ({ ToolPage: () => <div data-testid="tool-page" /> }));
jest.mock("../tools/GiveToAgentDialog", () => ({ GiveToAgentDialog: () => null }));

import { DataLibraryPage } from "../DataLibraryPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test("/data/library lands on the data library home, titled Data library, with a link to the Tools home", () => {
  search = "";
  act(() => root.render(<DataLibraryPage />));
  expect(host.querySelector('[data-testid="tools-home"]')).toBeNull();
  expect(host.querySelector('[data-testid="title"]')?.textContent).toBe("Data library");
  expect(host.querySelector("[data-tools-link]")).not.toBeNull();
});

test("the Tools home opens on its own door", () => {
  search = "view=tools";
  act(() => root.render(<DataLibraryPage />));
  expect(host.querySelector('[data-testid="tools-home"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="title"]')?.textContent).toBe("Tools");
});
