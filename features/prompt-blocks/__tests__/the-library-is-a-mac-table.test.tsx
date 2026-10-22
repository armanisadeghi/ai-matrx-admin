/**
 * @jest-environment jsdom
 */
/**
 * THE LIBRARY IS THE SHARED TABLE (live walk 2026-10-22, /agents/prompt-blocks): it drew its own
 * list — 44px two-line rows, always-on outlined checkboxes and a "Select blocks" bar of its own —
 * while every other list wears the Mac table. It is a MatrxDataTable now, losing nothing: one row
 * per block with its description and Skill / tool badges in their own columns, each row a link to
 * its block, the table's own selection and bulk bar, the lanes and the search in the address.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const BLOCKS = [
  { id: "b1", name: "Safety rails", label: "", description: "Keeps answers safe", organization_id: "org-1", visibility: "organization", created_by: "u1", source_kind: "skill", bound_tool: "web_search" },
  { id: "b2", name: "Tone guide", label: "Tone", description: null, organization_id: "org-1", visibility: "organization", created_by: "u1", source_kind: "block", bound_tool: null },
];
jest.mock("../blocksCache", () => ({ loadBlocks: () => Promise.resolve(BLOCKS), invalidateBlocks: () => undefined }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "u1", useAppDispatch: () => () => undefined }));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/features/shell/components/header/RouteHeader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/lib/entity-list/useTableBulkSelection", () => ({
  useTableBulkSelection: () => ({ selection: { selectedIds: [], onSelectedIdsChange: () => undefined }, selectedIds: [], clear: () => undefined, select: () => undefined }),
}));
jest.mock("next/navigation", () => ({ useSearchParams: () => null }));

import { PromptBlockLibrary } from "../components/PromptBlockLibrary";

let container: HTMLDivElement;
let root: Root;
const flush = async () => {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};
beforeAll(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  window.history.replaceState(null, "", "/agents/prompt-blocks?lane=organization");
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, "", "/");
});

it("draws the blocks in the shared table, one row per block, nothing lost", async () => {
  act(() => root.render(<PromptBlockLibrary />));
  await flush();
  expect(container.querySelector("[data-record-list]")).toBeNull();
  expect(container.textContent).not.toContain("Select blocks");
  const rows = [...container.querySelectorAll<HTMLElement>("[data-matrx-table] tbody tr[data-row-id]")];
  expect(rows.map((r) => r.getAttribute("data-row-id")).sort()).toEqual(["b1", "b2"]);
  const safety = rows.find((r) => r.getAttribute("data-row-id") === "b1")!;
  expect(safety.textContent).toContain("Safety rails");
  expect(safety.textContent).toContain("Keeps answers safe");
  expect(safety.textContent).toContain("Skill");
  expect(safety.textContent).toContain("web_search");
  expect(rows.find((r) => r.getAttribute("data-row-id") === "b2")!.textContent).toContain("Tone");
  expect(container.querySelector('a[href="/agents/prompt-blocks/b1"]')).not.toBeNull();
});
